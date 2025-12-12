import { useEffect, FC } from "react";
import { GeoData, GeoFeature } from "../geoDataType";

/**
 * Пропсы компонента ArcGISGeoRenderer
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

  /** Временные геоданные для рисования */
  tempGeoData: GeoData;

  /** Сохранённые геоданные (опционально) */
  savedGeoData?: GeoData;

  /** URL иконки маркера (опционально) */
  markerIconUrl?: string;
}

/**
 * ArcGISGeoRenderer — компонент, который отображает фичи на ArcGIS карте.
 * Поддерживает точки (Point) и линии (LineString) с кастомными символами.
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
   * Эффект отрисовки геофич на карте при изменении данных или готовности карты
   */
  useEffect(() => {
    if (!mapReady) return;

    const { Graphic, Point, Polyline, PictureMarkerSymbol, SimpleLineSymbol } = esriModules;

    if (!graphicsLayer || !Graphic || !Point || !Polyline || !PictureMarkerSymbol || !SimpleLineSymbol) {
      return;
    }

    // Очищаем предыдущие графические объекты
    graphicsLayer.removeAll();

    // Объединяем сохранённые и временные фичи
    const allFeatures: GeoFeature[] = [
      ...(savedGeoData?.features ?? []),
      ...(tempGeoData?.features ?? []),
    ];

    // Добавляем каждую фичу на карту
    allFeatures.forEach((feature) => {
      if (!feature.geometry) return;

      // Отрисовка точки
      if (feature.geometry.type === "Point") {
        const [lng, lat] = feature.geometry.coordinates as [number, number];

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
      }

      // Отрисовка линии
      if (feature.geometry.type === "LineString") {
        const coords = feature.geometry.coordinates as [number, number][];

        // Основная линия
        graphicsLayer.add(
          new Graphic({
            geometry: new Polyline({ paths: [coords] }),
            symbol: new SimpleLineSymbol({
              color: [255, 0, 0],
              width: 3,
            }),
          })
        );

        // Вершины линии
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
      }
    });
  }, [mapReady, graphicsLayer, esriModules, tempGeoData, savedGeoData, markerIconUrl]);

  return null;
};
