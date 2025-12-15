import { DrawActionType } from "../engines/drawActionType";
import { GeoData } from "../engines/geoDataType";
import { normalizeGeoData } from "./geoDataNormalizer";

/**
 * Генерирует уникальный идентификатор с текущей временной меткой.
 *
 * @returns Строка, представляющая уникальный идентификатор с временной меткой
 */
const generateGuidWithTime = (): string => {
  const uuid = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  return `${uuid}_${timestamp}`;
};

/**
 * Обновляет GeoData в зависимости от действия рисования.
 *
 * - MARKER: добавляет новую точку на карту.
 * - POLYLINE: добавляет точку в текущую временную линию или создаёт новую линию.
 *
 * @param previousGeoData - Текущие геоданные перед обновлением
 * @param coordinates - Координаты новой точки в формате [longitude, latitude]
 * @param drawAction - Тип действия рисования (MARKER, POLYLINE или undefined)
 * @returns Обновлённые GeoData после применения действия рисования
 */
export function updateGeoData(
  previousGeoData: GeoData | undefined,
  coordinates: [number, number],
  drawAction: DrawActionType | undefined
): GeoData {
  if (!drawAction) {
    return normalizeGeoData(
      previousGeoData ?? { type: "FeatureCollection", features: [] }
    );
  }

  const normalizedGeoData = normalizeGeoData(
    previousGeoData ?? { type: "FeatureCollection", features: [] }
  );

  const geoDataClone: GeoData =
    typeof structuredClone === "function"
      ? structuredClone(normalizedGeoData)
      : JSON.parse(JSON.stringify(normalizedGeoData));

  geoDataClone.features = Array.isArray(geoDataClone.features)
    ? geoDataClone.features
    : [];

  if (drawAction === DrawActionType.MARKER) {
    const id = `marker-${generateGuidWithTime()}`;

    geoDataClone.features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates,
      },
      properties: {
        id,
        type: "marker",
        isTemp: false,
      },
    });

    return geoDataClone;
  }

  if (drawAction === DrawActionType.POLYLINE) {
    const tempLine = [...geoDataClone.features]
      .reverse()
      .find(
        feature =>
          feature.geometry?.type === "LineString" &&
          feature.properties?.isTemp
      );

    if (tempLine && tempLine.geometry.type === "LineString") {
      (tempLine.geometry.coordinates as [number, number][]).push(coordinates);
    } else {
      const id = `polyline-${generateGuidWithTime()}`;

      geoDataClone.features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [coordinates],
        },
        properties: {
          id,
          type: "polyline",
          isTemp: true,
        },
      });
    }

    return geoDataClone;
  }

  return geoDataClone;
}
