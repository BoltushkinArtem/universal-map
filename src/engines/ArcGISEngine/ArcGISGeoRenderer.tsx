import { useEffect, useCallback, FC } from "react";
import { GeoData, GeoFeature } from "../geoDataType";

/**
 * Props компонента ArcGISGeoRenderer
 */
interface ArcGISGeoRendererProps {
  /** Флаг готовности карты */
  mapReady: boolean;

  /** Ссылка на слой графики ArcGIS */
  graphicsLayer: __esri.GraphicsLayer | null;

  /** Загруженные модули ArcGIS */
  esriModules: {
    Graphic?: typeof __esri.Graphic;
    Point?: typeof __esri.Point;
    Polyline?: typeof __esri.Polyline;
    PictureMarkerSymbol?: typeof __esri.PictureMarkerSymbol;
    SimpleLineSymbol?: typeof __esri.SimpleLineSymbol;
  };

  /** Временные геоданные для рендеринга */
  tempGeoData: GeoData;

  /** Сохранённые геоданные (опционально) */
  savedGeoData?: GeoData;

  /** URL иконки маркера (опционально) */
  markerIconUrl?: string;
}

/**
 * ArcGISGeoRenderer — компонент для отображения геоданных на ArcGIS карте.
 * Поддерживает:
 * - Точки (Point) с кастомной иконкой
 * - Линии (LineString) с основной линией и квадратными маркерами вершин
 */
export const ArcGISGeoRenderer: FC<ArcGISGeoRendererProps> = ({
  mapReady,
  graphicsLayer,
  esriModules,
  tempGeoData,
  savedGeoData,
  markerIconUrl,
}) => {
  /**
   * Проверка, является ли feature линией (LineString)
   * @param f - гео-фича
   * @returns true, если feature является линией
   */
  const isLineFeature = (f: GeoFeature): f is GeoFeature & {
    geometry: { type: "LineString"; coordinates: [number, number][] };
  } => f.geometry.type === "LineString";

  /**
   * Проверка, является ли feature точкой (Point)
   * @param f - гео-фича
   * @returns true, если feature является точкой
   */
  const isPointFeature = (f: GeoFeature): f is GeoFeature & {
    geometry: { type: "Point"; coordinates: [number, number] };
  } => f.geometry.type === "Point";

  /**
   * Рендер точечных маркеров на карте ArcGIS
   * - Добавляет новые маркеры
   * - Использует PictureMarkerSymbol для кастомной иконки
   */
  const renderMarkers = useCallback(() => {
    if (!mapReady || !graphicsLayer) return;

    const { Graphic, Point, PictureMarkerSymbol } = esriModules;
    if (!Graphic || !Point || !PictureMarkerSymbol) return;

    const allPoints = [
      ...(savedGeoData?.features ?? []),
      ...tempGeoData.features,
    ].filter(isPointFeature);

    allPoints.forEach(feature => {
      if (!feature.geometry) return;

      const [lng, lat] = feature.geometry.coordinates;

      graphicsLayer.add(
        new Graphic({
          geometry: new Point({ longitude: lng, latitude: lat }),
          symbol: new PictureMarkerSymbol({
            url: markerIconUrl ?? "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
            width: 32,
            height: 32,
          }),
        })
      );
    });
  }, [mapReady, graphicsLayer, esriModules, tempGeoData, savedGeoData, markerIconUrl]);

  /**
   * Рендер линий и квадратных маркеров вершин на карте ArcGIS
   * - Создает Polyline для каждой линии
   * - Добавляет отдельные квадратные маркеры для каждой вершины
   */
  const renderLines = useCallback(() => {
    if (!mapReady || !graphicsLayer) return;

    const { Graphic, Point, Polyline, SimpleLineSymbol } = esriModules;
    if (!Graphic || !Point || !Polyline || !SimpleLineSymbol) return;

    const allLines = [
      ...(savedGeoData?.features ?? []),
      ...tempGeoData.features,
    ].filter(isLineFeature);

    allLines.forEach(feature => {
      if (!feature.geometry) return;

      const coords = feature.geometry.coordinates;

      // Создаем основную линию с красным цветом и толщиной 3
      graphicsLayer.add(
        new Graphic({
          geometry: new Polyline({ paths: [coords] }),
          symbol: new SimpleLineSymbol({
            color: [255, 0, 0],
            width: 3,
          }),
        })
      );

      // Создаем квадратные маркеры для каждой вершины линии
      coords.forEach(([lng, lat]) => {
        graphicsLayer.add(
          new Graphic({
            geometry: new Point({ longitude: lng, latitude: lat }),
            symbol: {
              type: "simple-marker",
              style: "square",
              size: 10,
              color: [255, 255, 255],
              outline: { color: [0, 0, 0], width: 1 },
            } as any,
          })
        );
      });
    });
  }, [mapReady, graphicsLayer, esriModules, tempGeoData, savedGeoData]);

  /**
   * Основной рендер всех геоданных на карте
   * - Сначала линии и квадратные вершины
   * - Затем точечные маркеры
   * - Очищает предыдущие объекты перед отрисовкой
   */
  const renderGeoData = useCallback(() => {
    if (!graphicsLayer) return;

    graphicsLayer.removeAll();

    renderLines();
    renderMarkers();
  }, [graphicsLayer, renderLines, renderMarkers]);

  /**
   * Эффект для автоматического рендера при изменении данных или состояния карты
   */
  useEffect(() => {
    if (!mapReady) return;

    renderGeoData();
  }, [mapReady, renderGeoData]);

  return null;
};
