import { GeoData, GeoFeature } from "../engines/geoDataType";

/**
 * Приводит GeoJSON.FeatureCollection к внутреннему формату GeoData.
 * - Фильтрует некорректные геометрии
 * - Добавляет уникальные идентификаторы для каждой фичи
 * - Определяет тип фичи (marker или polyline)
 *
 * @param data - Исходный FeatureCollection GeoJSON
 * @returns Приведённый к GeoData объект с массивом валидных фич
 */
export const normalizeGeoData = (data?: GeoJSON.FeatureCollection<any>): GeoData => {
  if (!data) {
    return { type: "FeatureCollection", features: [] };
  }

  const normalizedFeatures: GeoFeature[] = data.features
    .map((feature): GeoFeature | null => {
      if (!feature.geometry) return null;
      if (feature.geometry.type !== "Point" && feature.geometry.type !== "LineString") return null;

      return {
        type: "Feature",
        geometry: feature.geometry as GeoJSON.Point | GeoJSON.LineString,
        properties: {
          id: feature.properties?.id ?? crypto.randomUUID(),
          type: feature.properties?.type === "marker" ? "marker" : "polyline",
          isTemp: feature.properties?.isTemp ?? false,
        },
      };
    })
    .filter((f): f is GeoFeature => f !== null);

  return {
    type: "FeatureCollection",
    features: normalizedFeatures,
  };
};
