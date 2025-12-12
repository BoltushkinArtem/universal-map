import React, { FC, useEffect, useRef, useState, useCallback } from "react";
import styles from "./ArcGISEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData } from "../geoDataType";
import { normalizeGeoData } from "../../utils/geoDataNormalizer";
import { updateGeoData } from "../../utils/updateGeoData";
import { ArcGISGeoRenderer } from "./ArcGISGeoRenderer";

/** Координаты центра карты по умолчанию */
const DEFAULT_CENTER: [number, number] = [37.6173, 55.7558];

/** Масштаб карты по умолчанию */
const DEFAULT_ZOOM = 10;

/**
 * Пропсы компонента ArcGISEngine
 */
interface ArcGISEngineProps {
  /** Идентификатор провайдера ArcGIS */
  providerId: string;

  /** Текущий режим рисования */
  drawActionType?: DrawActionType;

  /** URL иконки маркера */
  markerIconUrl?: string;

  /** Временные геоданные */
  tempGeoData: GeoData;

  /** Сохранённые геоданные (опционально) */
  savedGeoData?: GeoData;

  /** Колбэк при обновлении геоданных */
  onUpdateGeoData: (data: GeoData) => void;
}

/**
 * ArcGISEngine — компонент для работы с ArcGIS картой.
 * Обрабатывает инициализацию карты, клики пользователя и визуализацию фич.
 */
const ArcGISEngine: FC<ArcGISEngineProps> = ({
  providerId,
  drawActionType,
  markerIconUrl,
  tempGeoData,
  savedGeoData,
  onUpdateGeoData,
}) => {
  /** Ссылка на контейнер карты */
  const containerRef = useRef<HTMLDivElement | null>(null);

  /** Ссылка на MapView ArcGIS */
  const viewRef = useRef<__esri.MapView | null>(null);

  /** Ссылка на слой графики ArcGIS */
  const graphicsLayerRef = useRef<__esri.GraphicsLayer | null>(null);

  /** Ref текущего действия рисования */
  const drawActionRef = useRef(drawActionType);

  /** Флаг готовности карты */
  const [mapReady, setMapReady] = useState(false);

  /** Ref загруженных модулей ArcGIS */
  const esriModulesRef = useRef<any>({});

  /**
   * Обновление курсора и текущего действия рисования
   */
  useEffect(() => {
    drawActionRef.current = drawActionType;
    if (containerRef.current) {
      containerRef.current.style.cursor = drawActionType ? "crosshair" : "grab";
    }
  }, [drawActionType]);

  /**
   * Инициализация карты ArcGIS при смене провайдера
   */
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // Подгрузка скриптов и стилей ArcGIS, если не загружены
      if (!(window as any).require) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://js.arcgis.com/4.26/esri/themes/light/main.css";
        document.head.appendChild(link);

        const script = document.createElement("script");
        script.src = "https://js.arcgis.com/4.26/";
        document.body.appendChild(script);
        await new Promise((r) => (script.onload = r));
      }

      (window as any).require(
        [
          "esri/Map",
          "esri/views/MapView",
          "esri/layers/GraphicsLayer",
          "esri/Graphic",
          "esri/geometry/Point",
          "esri/geometry/Polyline",
          "esri/symbols/PictureMarkerSymbol",
          "esri/symbols/SimpleLineSymbol",
        ],
        (
          Map: any,
          MapView: any,
          GraphicsLayer: any,
          Graphic: any,
          Point: any,
          Polyline: any,
          PictureMarkerSymbol: any,
          SimpleLineSymbol: any
        ) => {
          if (!containerRef.current || cancelled) return;

          const map = new Map({
            basemap: providerId === "MapLibre_ArcGISAero" ? "satellite" : "streets-vector",
          });

          const view = new MapView({
            container: containerRef.current,
            map,
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
          });

          const graphicsLayer = new GraphicsLayer();
          map.add(graphicsLayer);

          viewRef.current = view;
          graphicsLayerRef.current = graphicsLayer;

          esriModulesRef.current = {
            Graphic,
            Point,
            Polyline,
            PictureMarkerSymbol,
            SimpleLineSymbol,
          };

          view.when(() => !cancelled && setMapReady(true));
        }
      );
    };

    init();

    return () => {
      cancelled = true;
      viewRef.current?.destroy();
    };
  }, [providerId]);

  /**
   * Обработка клика на карте для добавления точки или линии
   */
  const handleMapClick = useCallback(
    (e: __esri.ViewClickEvent) => {
      const action = drawActionRef.current;
      if (!action) return;

      const coord: [number, number] = [
        e.mapPoint.longitude,
        e.mapPoint.latitude,
      ];

      onUpdateGeoData(
        updateGeoData(normalizeGeoData(tempGeoData), coord, action)
      );
    },
    [tempGeoData, onUpdateGeoData]
  );

  /**
   * Подписка на клики по карте после готовности карты
   */
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !mapReady) return;
    const handler = view.on("click", handleMapClick);
    return () => handler.remove();
  }, [mapReady, handleMapClick]);

  return (
    <>
      <div ref={containerRef} className={styles.arcgisContainer} />
      <ArcGISGeoRenderer
        mapReady={mapReady}
        graphicsLayer={graphicsLayerRef.current}
        esriModules={esriModulesRef.current}
        tempGeoData={tempGeoData}
        savedGeoData={savedGeoData}
        markerIconUrl={markerIconUrl}
      />
    </>
  );
};

export default ArcGISEngine;
