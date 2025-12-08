import { DrawActionType } from "../engines/drawActionType";
import { GeoData } from "../engines/geoDataType";
import { normalizeGeoData } from "./geoDataNormalizer";

const generateGuidWithTime = () => {
  const uuid = crypto.randomUUID();
  const time = new Date().toISOString(); // с миллисекундами
  return `${uuid}_${time}`;
};

export function updateGeoData(
  prev: GeoData | undefined,
  coords: [number, number],
  action: DrawActionType | undefined
): GeoData {
  if (!action)
    return normalizeGeoData(
      prev ?? { type: "FeatureCollection", features: [] }
    );

  const normalized = normalizeGeoData(
    prev ?? { type: "FeatureCollection", features: [] }
  );

  const cloned: GeoData =
    typeof structuredClone === "function"
      ? structuredClone(normalized)
      : JSON.parse(JSON.stringify(normalized));

  cloned.features = Array.isArray(cloned.features) ? cloned.features : [];

  if (action === DrawActionType.MARKER) {
    const id = `marker-${generateGuidWithTime()}`;

    cloned.features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: coords,
      },
      properties: {
        id,
        type: "marker",
        isTemp: false,
      },
    });

    return cloned;
  }

  if (action === DrawActionType.POLYLINE) {
    const tempLine = cloned.features
      .slice()
      .reverse()
      .find(
        (f) =>
          f.geometry?.type === "LineString" &&
          f.properties?.isTemp
      );

    if (tempLine && tempLine.geometry.type === "LineString") {
      (tempLine.geometry.coordinates as [number, number][]).push(coords);
    } else {
      const id = `polyline-${generateGuidWithTime()}`;

      cloned.features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [coords],
        },
        properties: {
          id,
          type: "polyline",
          isTemp: true,
        },
      });
    }

    return cloned;
  }

  return cloned;
}



