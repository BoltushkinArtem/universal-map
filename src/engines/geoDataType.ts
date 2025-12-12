/**
 * Свойства фичи в GeoData
 */
export interface GeoFeatureProperties {
  /** Уникальный идентификатор фичи */
  id: string;

  /** Тип фичи: маркер (точка) или линия */
  type: "marker" | "polyline";

  /** Флаг временной фичи (true, если фича ещё не сохранена) */
  isTemp?: boolean;
}

/**
 * Фича GeoJSON для карты
 * - Может быть точкой (Point) или линией (LineString)
 * - Свойства определяются интерфейсом GeoFeatureProperties
 */
export type GeoFeature = GeoJSON.Feature<
  GeoJSON.Point | GeoJSON.LineString,
  GeoFeatureProperties
>;

/**
 * Коллекция фич GeoJSON
 * - Массив фич GeoFeature
 * - Соответствует типу FeatureCollection
 */
export type GeoData = GeoJSON.FeatureCollection<
  GeoJSON.Point | GeoJSON.LineString,
  GeoFeatureProperties
>;
