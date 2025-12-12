import { useEffect, useRef, useState } from "react";

/**
 * Загруженные модули ArcGIS API
 */
interface EsriModules {
  Graphic?: typeof __esri.Graphic;
  Point?: typeof __esri.Point;
  Polyline?: typeof __esri.Polyline;
  PictureMarkerSymbol?: typeof __esri.PictureMarkerSymbol;
  SimpleLineSymbol?: typeof __esri.SimpleLineSymbol;
}

/**
 * Пропсы для хука useArcGISMapInit
 */
interface UseArcGISMapInitProps {
  /** Идентификатор провайдера ArcGIS, используется для выбора базовой карты */
  providerId: string;

  /** Ref контейнера карты, в котором будет создан MapView */
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * useArcGISMapInit — хук инициализации карты ArcGIS
 * - Загружает ArcGIS API при необходимости
 * - Создаёт MapView и GraphicsLayer
 * - Подгружает необходимые модули ArcGIS
 * - Возвращает рефы и флаг готовности карты
 *
 * @param props.providerId - идентификатор провайдера карты
 * @param props.containerRef - ref контейнера для карты
 * @returns {object} { viewRef, graphicsLayerRef, esriModulesRef, mapReady }
 */
export const useArcGISMapInit = ({ providerId, containerRef }: UseArcGISMapInitProps) => {
  /** Ref MapView ArcGIS */
  const viewRef = useRef<__esri.MapView | null>(null);

  /** Ref слоя графики ArcGIS */
  const graphicsLayerRef = useRef<__esri.GraphicsLayer | null>(null);

  /** Ref загруженных модулей ArcGIS */
  const esriModulesRef = useRef<EsriModules>({});

  /** Флаг готовности карты */
  const [mapReady, setMapReady] = useState(false);

  /**
   * Эффект инициализации карты
   * - Подгружает ArcGIS API если он ещё не загружен
   * - Создаёт MapView и GraphicsLayer
   * - Сохраняет ссылки на загруженные модули
   */
  useEffect(() => {
    let cancelled = false;

    /** Инициализация карты */
    const init = async () => {
      // Подгрузка CSS и JS ArcGIS API если ещё не загружен
      if (!(window as any).require) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://js.arcgis.com/4.26/esri/themes/light/main.css";
        document.head.appendChild(link);

        const script = document.createElement("script");
        script.src = "https://js.arcgis.com/4.26/";
        document.body.appendChild(script);
        await new Promise<void>((resolve) => (script.onload = () => resolve()));
      }

      // Подключение модулей ArcGIS через require
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

          // Создание карты с выбором базовой карты в зависимости от провайдера
          const map = new Map({
            basemap: providerId === "MapLibre_ArcGISAero" ? "satellite" : "streets-vector",
          });

          // Создание MapView
          const view = new MapView({
            container: containerRef.current,
            map,
            center: [37.6173, 55.7558], // Москва по умолчанию
            zoom: 10, // Масштаб по умолчанию
          });

          // Создание слоя графики
          const graphicsLayer = new GraphicsLayer();
          map.add(graphicsLayer);

          // Сохраняем рефы для использования в других компонентах или хуках
          viewRef.current = view;
          graphicsLayerRef.current = graphicsLayer;

          // Сохраняем загруженные модули ArcGIS
          esriModulesRef.current = {
            Graphic,
            Point,
            Polyline,
            PictureMarkerSymbol,
            SimpleLineSymbol,
          };

          // Устанавливаем флаг готовности карты после полной загрузки View
          view.when(() => !cancelled && setMapReady(true));
        }
      );
    };

    init();

    // Очистка при размонтировании
    return () => {
      cancelled = true;
      viewRef.current?.destroy();
    };
  }, [providerId, containerRef]);

  // Возвращаем все нужные рефы и флаг готовности карты
  return {
    viewRef,
    graphicsLayerRef,
    esriModulesRef,
    mapReady,
  };
};
