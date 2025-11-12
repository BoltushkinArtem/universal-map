import React, { FC, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { tileTemplate } from "../../../utils/providers";
import styles from "./MapLibreEngine.module.scss";

interface MapLibreEngineProps {
  /** Идентификатор провайдера тайлов */
  providerId: string;
  /** Включает возможность добавления маркеров по клику */
  drawMarkerOn: boolean;
  /** URL кастомной иконки маркера */
  markerIconUrl?: string;
}

interface MarkerData {
  id: number;
  lngLat: maplibregl.LngLatLike;
}

/** Проверка поддержки WebGL в браузере */
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

/**
 * Компонент карты MapLibre с поддержкой добавления и удаления маркеров
 */
const MapLibreEngine: FC<MapLibreEngineProps> = ({
  providerId,
  drawMarkerOn,
  markerIconUrl,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [markerData, setMarkerData] = useState<MarkerData[]>([]);
  const markerIdRef = useRef(0);

  /** Инициализация карты и базового слоя */
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (!isWebGLAvailable()) {
      console.error(
        "WebGL не поддерживается в этом браузере. MapLibre карта не будет отображена."
      );
      return;
    }

    const mapInstance = new maplibregl.Map({
      container,
      style: "https://demotiles.maplibre.org/style.json",
      center: [37.6173, 55.7558],
      zoom: 10,
    });

    mapRef.current = mapInstance;

    mapInstance.on("load", () => {
      const tiles = tileTemplate(providerId);

      if (!tiles?.length) {
        console.warn("tileTemplate вернул пустой массив для", providerId);
        return;
      }

      if (!mapInstance.getSource("basemap")) {
        mapInstance.addSource("basemap", {
          type: "raster",
          tiles,
          tileSize: 256,
        });

        mapInstance.addLayer({
          id: "basemap",
          type: "raster",
          source: "basemap",
        });
      }
    });

    // Функция очистки для useEffect — удаляем маркеры и карту при размонтировании
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [providerId]);

  /** Обновление тайлов при смене провайдера */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource("basemap") as maplibregl.RasterTileSource | undefined;
    if (!source) return;

    (source as any).tiles = tileTemplate(providerId);
    map.triggerRepaint();
  }, [providerId]);

  /** Обработка кликов для добавления маркеров */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (!drawMarkerOn) return;

      const markerElement = document.createElement("div");
      markerElement.style.width = "32px";
      markerElement.style.height = "32px";
      markerElement.style.backgroundImage = `url(${
        markerIconUrl || "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
      })`;
      markerElement.style.backgroundSize = "contain";
      markerElement.style.backgroundRepeat = "no-repeat";

      const marker = new maplibregl.Marker({ element: markerElement, draggable: true })
        .setLngLat(e.lngLat)
        .addTo(map);

      markersRef.current.push(marker);

      const nextId = ++markerIdRef.current;
      setMarkerData((prev) => [...prev, { id: nextId, lngLat: e.lngLat }]);
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
    };
  }, [drawMarkerOn, markerIconUrl]);

  /** Удаление последнего маркера */
  const removeLastMarker = (): void => {
    const lastMarker = markersRef.current.pop();
    lastMarker?.remove();
    setMarkerData((prev) => prev.slice(0, -1));
  };

  return (
    <div className={styles.mapContainer}>
      <div ref={mapContainerRef} className={styles.mapInner} />
      <button onClick={removeLastMarker} className={styles.removeMarkerButton}>
        Remove Last Marker
      </button>
    </div>
  );
};

export default MapLibreEngine;
