import { useEffect } from "react";
import { GeoData, GeoFeature } from "../geoDataType";

interface ArcGISGeoRendererProps {
  mapReady: boolean;
  graphicsLayer: __esri.GraphicsLayer | null;
  esriModules: {
    Graphic?: typeof __esri.Graphic;
    Point?: typeof __esri.Point;
    Polyline?: typeof __esri.Polyline;
    PictureMarkerSymbol?: typeof __esri.PictureMarkerSymbol;
    SimpleLineSymbol?: typeof __esri.SimpleLineSymbol;
  };
  tempGeoData: GeoData;
  savedGeoData?: GeoData;
  markerIconUrl?: string;
}

export const ArcGISGeoRenderer = ({
  mapReady,
  graphicsLayer,
  esriModules,
  tempGeoData,
  savedGeoData,
  markerIconUrl,
}: ArcGISGeoRendererProps) => {
  useEffect(() => {
    if (!mapReady) return;

    const {
      Graphic,
      Point,
      Polyline,
      PictureMarkerSymbol,
      SimpleLineSymbol,
    } = esriModules;

    if (
      !graphicsLayer ||
      !Graphic ||
      !Point ||
      !Polyline ||
      !PictureMarkerSymbol ||
      !SimpleLineSymbol
    )
      return;

    graphicsLayer.removeAll();

    const allFeatures: GeoFeature[] = [
      ...(savedGeoData?.features ?? []),
      ...(tempGeoData?.features ?? []),
    ];

    allFeatures.forEach((f) => {
      if (!f.geometry) return;

      if (f.geometry.type === "Point") {
        const [lng, lat] = f.geometry.coordinates as [number, number];
        graphicsLayer.add(
          new Graphic({
            geometry: new Point({ longitude: lng, latitude: lat }),
            symbol: new PictureMarkerSymbol({
              url:
                markerIconUrl ??
                "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
              width: 32,
              height: 32,
            }),
          })
        );
      }

      if (f.geometry.type === "LineString") {
        const coords = f.geometry.coordinates as [number, number][];

        graphicsLayer.add(
          new Graphic({
            geometry: new Polyline({ paths: [coords] }),
            symbol: new SimpleLineSymbol({
              color: [255, 0, 0],
              width: 3,
            }),
          })
        );

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
