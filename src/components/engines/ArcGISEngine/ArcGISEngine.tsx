import React, { FC, useEffect, useRef } from "react";
import styles from "./ArcGISEngine.module.scss";

interface ArcGISEngineProps {
  /** Идентификатор провайдера, определяющий тип базовой карты */
  providerId: string;
  /** Включает возможность рисования маркеров на карте */
  drawMarkerOn?: boolean;
  /** URL кастомной иконки для маркера */
  markerIconUrl?: string;
}

/**
 * ArcGISEngine — компонент для отображения карты ArcGIS с поддержкой установки маркеров.
 */
const ArcGISEngine: FC<ArcGISEngineProps> = ({
  providerId,
  drawMarkerOn = false,
  markerIconUrl,
}) => {
  // Контейнер DOM для карты
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Ссылки на MapView и обработчик клика
  const viewRef = useRef<__esri.MapView | null>(null);
  const clickHandlerRef = useRef<__esri.WatchHandle | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Динамическая загрузка ArcGIS JS API и CSS
    const loadArcGisApi = async (): Promise<void> => {
      if ((window as any).require) return;

      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "https://js.arcgis.com/4.26/esri/themes/light/main.css";
      document.head.appendChild(cssLink);

      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://js.arcgis.com/4.26/";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("ArcGIS API failed to load"));
        document.head.appendChild(script);
      });
    };

    // Инициализация карты ArcGIS
    const initMap = async (): Promise<void> => {
      await loadArcGisApi();
      if (cancelled || !containerRef.current) return;

      (window as any).require(
        [
          "esri/Map",
          "esri/views/MapView",
          "esri/Graphic",
          "esri/layers/GraphicsLayer",
          "esri/geometry/Point",
          "esri/symbols/PictureMarkerSymbol",
        ],
        (
          Map: typeof __esri.Map,
          MapView: typeof __esri.MapView,
          Graphic: typeof __esri.Graphic,
          GraphicsLayer: typeof __esri.GraphicsLayer,
          Point: typeof __esri.Point,
          PictureMarkerSymbol: typeof __esri.PictureMarkerSymbol
        ) => {
          if (cancelled) return;

          // Создание карты с базовой подложкой
          const map = new Map({
            basemap:
              providerId === "MapLibre_ArcGISAero" ? "satellite" : "streets-vector",
          });

          // Создание MapView и привязка к контейнеру
          const view = new MapView({
            container: containerRef.current!,
            map,
            center: [37.6173, 55.7558],
            zoom: 10,
          });
          viewRef.current = view;

          // Добавление слоя графики
          const graphicsLayer = new GraphicsLayer();
          map.add(graphicsLayer);

          // Обработчик клика для добавления маркеров
          if (drawMarkerOn) {
            clickHandlerRef.current = view.on(
              "click",
              (event: __esri.ViewClickEvent) => {
                const point = new Point({
                  longitude: event.mapPoint.longitude,
                  latitude: event.mapPoint.latitude,
                });

                const symbol = new PictureMarkerSymbol({
                  url:
                    markerIconUrl ||
                    "/custom-marker.png" ||
                    "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                  width: 32,
                  height: 32,
                });

                const marker = new Graphic({ geometry: point, symbol });
                graphicsLayer.add(marker);
              }
            );
          }
        }
      );
    };

    initMap().catch(console.error);

    // Очистка при размонтировании компонента
    return () => {
      cancelled = true;

      clickHandlerRef.current?.remove();
      clickHandlerRef.current = null;

      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [providerId, drawMarkerOn, markerIconUrl]);

  return <div ref={containerRef} className={styles.arcgisContainer} />;
};

export default ArcGISEngine;
