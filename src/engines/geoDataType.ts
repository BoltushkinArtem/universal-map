export interface GeoFeatureProperties {
  id: string;
  type: "marker" | "polyline";
  isTemp?: boolean;
}

export type GeoFeature = GeoJSON.Feature<
  GeoJSON.Point | GeoJSON.LineString,
  GeoFeatureProperties
>;

export type GeoData = GeoJSON.FeatureCollection<
  GeoJSON.Point | GeoJSON.LineString,
  GeoFeatureProperties
>;