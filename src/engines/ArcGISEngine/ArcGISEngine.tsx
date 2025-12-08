import React, { FC, useEffect, useRef, useState, useCallback } from "react";
import styles from "./ArcGISEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData, GeoFeature } from "../geoDataType";
import { normalizeGeoData } from "../../utils/geoDataNormalizer";
import { updateGeoData } from "../../utils/updateGeoData";

interface ArcGISEngineProps {
  providerId: string;
  drawActionType?: DrawActionType;
  markerIconUrl?: string;
  tempGeoData: GeoData;
  savedGeoData?: GeoData;
  onUpdateGeoData: (data: GeoData) => void;
}

const DEFAULT_CENTER: [number, number] = [37.6173, 55.7558];
const DEFAULT_ZOOM = 10;

const ArcGISEngine: FC<ArcGISEngineProps> = ({
  providerId,
  drawActionType,
  markerIconUrl,
  tempGeoData,
  savedGeoData,
  onUpdateGeoData,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<__esri.MapView | null>(null);
  const graphicsLayerRef = useRef<__esri.GraphicsLayer | null>(null);
  const drawActionRef = useRef(drawActionType);
  const nextIdRef = useRef(1);

  const [mapReady, setMapReady] = useState(false);

  const esriModulesRef = useRef<{
    Graphic?: typeof __esri.Graphic;
    Point?: typeof __esri.Point;
    Polyline?: typeof __esri.Polyline;
    PictureMarkerSymbol?: typeof __esri.PictureMarkerSymbol;
    SimpleLineSymbol?: typeof __esri.SimpleLineSymbol;
  }>({});

  // ---- UPDATE DRAW ACTION ----
  useEffect(() => {
    drawActionRef.current = drawActionType;
    if (containerRef.current) {
      containerRef.current.style.cursor = drawActionType ? "crosshair" : "grab";
    }
  }, [drawActionType]);

  // ---- LOAD ARCGIS MAP ----
  useEffect(() => {
    let cancelled = false;

    const loadApi = async () => {
      if ((window as any).require) return;

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://js.arcgis.com/4.26/esri/themes/light/main.css";
      document.head.appendChild(link);

      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://js.arcgis.com/4.26/";
        script.onload = () => resolve();
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    const initMap = () => {
      (window as any).require(
        [
          "esri/Map",
          "esri/views/MapView",
          "esri/layers/GraphicsLayer",
          "esri/Graphic",
          "esri/geometry/Point",
          "esri/geometry/Polyline",
          "esri/symbols/PictureMarkerSymbol",
          "esri/symbols/SimpleLineSymbol",
        ],
        (
          Map: typeof __esri.Map,
          MapView: typeof __esri.MapView,
          GraphicsLayer: typeof __esri.GraphicsLayer,
          Graphic: typeof __esri.Graphic,
          Point: typeof __esri.Point,
          Polyline: typeof __esri.Polyline,
          PictureMarkerSymbol: typeof __esri.PictureMarkerSymbol,
          SimpleLineSymbol: typeof __esri.SimpleLineSymbol
        ) => {
          if (cancelled || !containerRef.current) return;

          const map = new Map({
            basemap: providerId === "MapLibre_ArcGISAero" ? "satellite" : "streets-vector",
          });

          const view = new MapView({
            container: containerRef.current,
            map,
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
          });

          const graphicsLayer = new GraphicsLayer();
          map.add(graphicsLayer);

          viewRef.current = view;
          graphicsLayerRef.current = graphicsLayer;

          esriModulesRef.current = { Graphic, Point, Polyline, PictureMarkerSymbol, SimpleLineSymbol };

          view.when(() => !cancelled && setMapReady(true));
        }
      );
    };

    loadApi().then(() => !cancelled && initMap());

    return () => {
      cancelled = true;
      viewRef.current?.destroy();
      viewRef.current = null;
      graphicsLayerRef.current = null;
    };
  }, [providerId]);

  // ---- HANDLE DRAWING ----
  const handleMapClick = useCallback(
    (event: __esri.ViewClickEvent) => {
      const action = drawActionRef.current;
      if (!action) return;

      const { longitude, latitude } = event.mapPoint;
      const coord: [number, number] = [longitude, latitude];

      const updated = updateGeoData(normalizeGeoData(tempGeoData), coord, action);
      onUpdateGeoData(updated);
    },
    [tempGeoData, onUpdateGeoData]
  );

  // ---- BIND CLICK HANDLER ----
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !mapReady) return;

    const handle = view.on("click", handleMapClick);
    return () => handle.remove();
  }, [mapReady, handleMapClick]);

  // ---- RENDER GEO DATA ----
  useEffect(() => {
    if (!mapReady) return;

    const graphicsLayer = graphicsLayerRef.current;
    const { Graphic, Point, Polyline, PictureMarkerSymbol, SimpleLineSymbol } = esriModulesRef.current;
    if (!graphicsLayer || !Graphic || !Point || !Polyline || !PictureMarkerSymbol || !SimpleLineSymbol) return;

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
              url: markerIconUrl ?? "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
              width: 32,
              height: 32,
            }),
          })
        );
      }

      if (f.geometry.type === "LineString") {
        const coords = f.geometry.coordinates as [number, number][];
        const polyline = new Polyline({ paths: [coords] });
        graphicsLayer.add(
          new Graphic({ geometry: polyline, symbol: new SimpleLineSymbol({ color: [255, 0, 0], width: 3 }) })
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
  }, [tempGeoData, savedGeoData, mapReady, markerIconUrl]);

  return <div ref={containerRef} className={styles.arcgisContainer} />;
};

export default ArcGISEngine;