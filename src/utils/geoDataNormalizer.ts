import { GeoData, GeoFeature } from "../engines/geoDataType";

export const normalizeGeoData = (data?: GeoJSON.FeatureCollection<any>): GeoData => {
  if (!data) return { type: "FeatureCollection", features: [] };

  return {
    type: "FeatureCollection",
    features: data.features
      .map((f): GeoFeature | null => {
        if (!f.geometry) return null;
        if (f.geometry.type !== "Point" && f.geometry.type !== "LineString") return null;

        return {
          type: "Feature",
          geometry: f.geometry as GeoJSON.Point | GeoJSON.LineString,
          properties: {
            id: f.properties?.id ?? crypto.randomUUID(),
            type: f.properties?.type === "marker" ? "marker" : "polyline",
            isTemp: f.properties?.isTemp ?? false,
          },
        };
      })
      .filter(Boolean) as GeoFeature[],
  };
}