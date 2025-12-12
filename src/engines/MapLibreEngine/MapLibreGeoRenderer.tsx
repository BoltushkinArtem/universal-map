import { useEffect, useCallback, RefObject } from "react";
import maplibregl, { GeoJSONSource, Map as MapLibreMap, LngLatLike } from "maplibre-gl";
import { GeoData, GeoFeature } from "../geoDataType";
import { normalizeGeoData } from "../../utils/geoDataNormalizer";

/**
 * Пропсы компонента MapLibreGeoRenderer
 */
interface MapLibreGeoRendererProps {
  /** Экземпляр карты MapLibre */
  map: MapLibreMap | null;
  /** Временные геоданные пользователя */
  tempGeoData: GeoData;
  /** Сохранённые геоданные (опционально) */
  savedGeoData?: GeoData;
  /** URL иконки для точечных маркеров */
  markerIconUrl?: string;
  /** Ref для хранения маркеров по их ID */
  markersRef: RefObject<Map<string, maplibregl.Marker>>;
}

/**
 * MapLibreGeoRenderer — компонент для рендеринга маркеров, линий и вершин на карте MapLibre.
 *
 * Логика:
 * 1. Сначала отрисовываются линии и вершины линий.
 * 2. Затем рендерятся точечные маркеры.
 */
export const MapLibreGeoRenderer = ({
  map,
  tempGeoData,
  savedGeoData,
  markerIconUrl,
  markersRef,
}: MapLibreGeoRendererProps) => {
  /**
   * Проверка, является ли feature линией (LineString)
   */
  const isLineFeature = (f: GeoFeature): f is GeoFeature & {
    geometry: { type: "LineString"; coordinates: [number, number][] };
  } => f.geometry.type === "LineString";

  /**
   * Проверка, является ли feature точкой (Point)
   */
  const isPointFeature = (f: GeoFeature): f is GeoFeature & {
    geometry: { type: "Point"; coordinates: [number, number] };
  } => f.geometry.type === "Point";

  /**
   * Рендер всех точечных маркеров
   * - Добавление новых маркеров
   * - Обновление координат существующих маркеров
   * - Удаление устаревших маркеров
   */
  const renderMarkers = useCallback(() => {
    if (!map || !markersRef.current) return;

    // Нормализуем данные для корректного рендера
    const normalizedSaved = normalizeGeoData(savedGeoData);
    const normalizedTemp = normalizeGeoData(tempGeoData);

    // Собираем все точечные фичи (сохранённые + временные)
    const allPoints = [...normalizedSaved.features, ...normalizedTemp.features].filter(isPointFeature);

    // Set актуальных ID для удаления старых маркеров
    const newIds = new Set<string>();

    allPoints.forEach((feature) => {
      const id = feature.properties?.id?.toString();
      if (!id) return;
      newIds.add(id);

      let marker = markersRef.current.get(id);
      const [lng, lat] = feature.geometry.coordinates;

      if (marker) {
        // Обновляем координаты существующего маркера
        const currentLngLat = marker.getLngLat();
        if (currentLngLat.lng !== lng || currentLngLat.lat !== lat) {
          marker.setLngLat([lng, lat] as LngLatLike);
        }
      } else {
        // Создание DOM-элемента маркера
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.style.width = "32px";
        el.style.height = "32px";
        el.style.backgroundImage = `url(${markerIconUrl ?? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"})`;
        el.style.backgroundSize = "contain";
        el.style.backgroundRepeat = "no-repeat";

        // Создание маркера и добавление на карту
        marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat] as LngLatLike).addTo(map);
        markersRef.current.set(id, marker);
      }
    });

    // Удаляем маркеры, которых больше нет в данных
    markersRef.current.forEach((marker, id) => {
      if (!newIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [map, markerIconUrl, savedGeoData, tempGeoData, markersRef]);

  /**
   * Рендер линий и их вершин
   * - Создание/обновление GeoJSON слоя с линиями
   * - Создание/обновление GeoJSON слоя с вершинами линий
   */
  const renderLines = useCallback(() => {
    if (!map) return;

    const normalizedSaved = normalizeGeoData(savedGeoData);
    const normalizedTemp = normalizeGeoData(tempGeoData);
    const allFeatures = [...normalizedSaved.features, ...normalizedTemp.features];

    // Отбираем только линии
    const lineFeatures = allFeatures.filter(isLineFeature);

    // --- Слой линий ---
    const lineSourceId = "geo-lines";
    const lineCollection: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: "FeatureCollection",
      features: lineFeatures.map(f => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: f.geometry.coordinates as [number, number][] },
        properties: f.properties ?? {},
      })),
    };

    if (map.getSource(lineSourceId)) {
      (map.getSource(lineSourceId) as GeoJSONSource).setData(lineCollection);
    } else if (lineFeatures.length > 0) {
      map.addSource(lineSourceId, { type: "geojson", data: lineCollection });
      map.addLayer({
        id: lineSourceId,
        type: "line",
        source: lineSourceId,
        paint: { "line-color": "#ff0000", "line-width": 3 },
      });
    }

    // --- Вершины линий ---
    const vertexFeatures: GeoJSON.Feature<GeoJSON.Point>[] = lineFeatures.flatMap((lf) =>
      lf.geometry.coordinates.map((coord, idx) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: coord as [number, number] },
        properties: { id: `${lf.properties?.id ?? "ln"}-${idx}` },
      }))
    );

    const vertexSourceId = "geo-vertices";
    const vertexCollection: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: "FeatureCollection",
      features: vertexFeatures,
    };

    if (map.getSource(vertexSourceId)) {
      (map.getSource(vertexSourceId) as GeoJSONSource).setData(vertexCollection);
    } else if (vertexFeatures.length > 0) {
      map.addSource(vertexSourceId, { type: "geojson", data: vertexCollection });
      map.addLayer({
        id: vertexSourceId,
        type: "symbol",
        source: vertexSourceId,
        layout: {
          "icon-image": "white-square",
          "icon-size": 1,
          "icon-allow-overlap": true,
          "icon-anchor": "center",
        },
      });
    }
  }, [map, savedGeoData, tempGeoData]);

  /**
   * Основная функция рендеринга всех геоданных
   * - Сначала линии и вершины
   * - Затем точечные маркеры
   */
  const renderGeoData = useCallback(() => {
    renderLines();
    renderMarkers();
  }, [renderLines, renderMarkers]);

  /**
   * Эффект для автоматического рендера геоданных при изменении карты или данных
   */
  useEffect(() => {
    if (!map) return;
    renderGeoData();
  }, [map, renderGeoData]);

  return null;
};
