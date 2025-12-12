import { FC, useEffect, useRef, useCallback, useState } from "react";
import maplibregl, { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { tileTemplate } from "../../utils/providers";
import styles from "./MapLibreEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData } from "../geoDataType";
import { updateGeoData } from "../../utils/updateGeoData";
import { MapLibreGeoRenderer } from "./MapLibreGeoRenderer";

/** Начальная позиция карты [долгота, широта] */
const DEFAULT_CENTER: [number, number] = [37.6173, 55.7558];

/** Начальный масштаб карты */
const DEFAULT_ZOOM = 10;

/**
 * Проверяет, поддерживается ли WebGL
 */
const isWebGLAvailable = (): boolean => {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
};

/** Пропсы компонента MapLibreEngine */
interface MapLibreEngineProps {
  providerId: string;
  drawActionType?: DrawActionType;
  markerIconUrl?: string;
  tempGeoData: GeoData;
  savedGeoData?: GeoData;
  onUpdateGeoData: (data: GeoData) => void;
}

/**
 * MapLibreEngine — компонент для рендеринга карты с MapLibre.
 * Поддерживает добавление маркеров и работу с полилиниями через GeoData.
 */
const MapLibreEngine: FC<MapLibreEngineProps> = ({
  providerId,
  drawActionType,
  markerIconUrl,
  tempGeoData,
  savedGeoData,
  onUpdateGeoData,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const drawActionRef = useRef(drawActionType);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  const [mapReady, setMapReady] = useState(false);

  /** Инициализация карты и базового слоя */
  useEffect(() => {
    if (!mapContainerRef.current || !isWebGLAvailable()) return;

    setMapReady(false);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    mapRef.current = map;

    /** Настройка источников и изображений карты после загрузки */
    const onLoad = () => {
      const tiles = tileTemplate(providerId);
      if (tiles?.length && !map.getSource("basemap")) {
        map.addSource("basemap", { type: "raster", tiles, tileSize: 256 });
        map.addLayer({ id: "basemap", type: "raster", source: "basemap" });
      }

      if (!map.hasImage("white-square")) {
        const size = 8;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, size, size);
          const imageData = ctx.getImageData(0, 0, size, size);
          map.addImage("white-square", imageData);
        }
      }
    };

    map.on("load", onLoad);

    const onIdle = () => setMapReady(true);
    map.on("idle", onIdle);

    return () => {
      map.off("load", onLoad);
      map.off("idle", onIdle);
      map.remove();
      mapRef.current = null;
    };
  }, [providerId]);

  /** Обновление ссылки на текущий тип действия рисования */
  useEffect(() => {
    drawActionRef.current = drawActionType;
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = drawActionType ? "crosshair" : "";
    }
  }, [drawActionType]);

  /**
   * Обработчик клика на карте
   * Добавляет точку или обновляет полилинию в зависимости от текущего DrawActionType
   */
  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      const action = drawActionRef.current;
      if (!action) return;

      const coords: [number, number] = [event.lngLat.lng, event.lngLat.lat];
      onUpdateGeoData(
        updateGeoData(
          { type: "FeatureCollection", features: [...tempGeoData.features] },
          coords,
          action
        )
      );
    },
    [tempGeoData, onUpdateGeoData]
  );

  /** Подписка на события клика на карте */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [handleMapClick]);

  return (
    <>
      <div ref={mapContainerRef} className={styles.mapInner} />
      {mapReady && mapRef.current && (
        <MapLibreGeoRenderer
          map={mapRef.current}
          tempGeoData={tempGeoData}
          savedGeoData={savedGeoData}
          markerIconUrl={markerIconUrl}
          markersRef={markersRef}
        />
      )}
    </>
  );
};

export default MapLibreEngine;
