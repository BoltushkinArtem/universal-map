import { useEffect, useCallback } from "react";
import maplibregl, { GeoJSONSource, Map as MapLibreMap, LngLatLike } from "maplibre-gl";
import { GeoData, GeoFeature } from "../geoDataType";
import { normalizeGeoData } from "../../utils/geoDataNormalizer";

/** Пропсы компонента MapLibreGeoRenderer */
interface MapLibreGeoRendererProps {
  /** Инстанс карты MapLibre */
  map: MapLibreMap | null;
  /** Временные геоданные, пока пользователь рисует */
  tempGeoData: GeoData;
  /** Сохранённые геоданные */
  savedGeoData?: GeoData;
  /** URL иконки для маркера */
  markerIconUrl?: string;
  /** Ref для хранения маркеров по их id */
  markersRef: React.MutableRefObject<Map<string, maplibregl.Marker>>;
}

/**
 * MapLibreGeoRenderer — компонент для отрисовки маркеров, линий и вершин на карте MapLibre
 */
export const MapLibreGeoRenderer = ({
  map,
  tempGeoData,
  savedGeoData,
  markerIconUrl,
  markersRef,
}: MapLibreGeoRendererProps) => {

  /** Проверка, что feature является линией */
  const isLineFeature = (f: GeoFeature): f is GeoFeature & { geometry: { type: "LineString"; coordinates: [number, number][] } } =>
    f.geometry.type === "LineString";

  /** Проверка, что feature является точкой */
  const isPointFeature = (f: GeoFeature): f is GeoFeature & { geometry: { type: "Point"; coordinates: [number, number] } } =>
    f.geometry.type === "Point";

  /**
   * Рендер маркеров на карте
   * Создаёт новые маркеры, обновляет позиции существующих и удаляет устаревшие
   */
  const renderMarkers = useCallback(() => {
    if (!map) return;

    const normalizedSaved = normalizeGeoData(savedGeoData);
    const normalizedTemp = normalizeGeoData(tempGeoData);

    const allPoints = [...normalizedSaved.features, ...normalizedTemp.features].filter(isPointFeature);

    const newIds = new Set<string>();

    allPoints.forEach((feature) => {
      const id = feature.properties?.id?.toString();
      if (!id) return;

      newIds.add(id);

      let marker = markersRef.current.get(id);
      const [lng, lat] = feature.geometry.coordinates;

      if (marker) {
        const curr = marker.getLngLat();
        if (curr.lng !== lng || curr.lat !== lat) {
          marker.setLngLat([lng, lat] as LngLatLike);
        }
      } else {
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.style.width = "32px";
        el.style.height = "32px";
        el.style.backgroundImage = `url(${markerIconUrl ?? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"})`;
        el.style.backgroundSize = "contain";
        el.style.backgroundRepeat = "no-repeat";

        marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat] as LngLatLike).addTo(map);
        markersRef.current.set(id, marker);
      }
    });

    markersRef.current.forEach((marker, id) => {
      if (!newIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [map, markerIconUrl, savedGeoData, tempGeoData, markersRef]);

  /**
   * Основная функция рендеринга геоданных
   * Отрисовывает линии, вершины линий и маркеры
   */
  const renderGeoData = useCallback(() => {
    if (!map) return;

    const normalizedSaved = normalizeGeoData(savedGeoData);
    const normalizedTemp = normalizeGeoData(tempGeoData);
    const allFeatures = [...normalizedSaved.features, ...normalizedTemp.features];

    const lineFeatures = allFeatures.filter(isLineFeature);

    // --- Линии ---
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
    const vertexFeatures: GeoJSON.Feature<GeoJSON.Point>[] = lineFeatures.flatMap(lf =>
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

    renderMarkers();
  }, [map, renderMarkers, savedGeoData, tempGeoData]);

  /** Авто-рендер геоданных при изменении карты или геоданных */
  useEffect(() => {
    if (!map) return;
    renderGeoData();
  }, [map, renderGeoData]);

  return null;
};
