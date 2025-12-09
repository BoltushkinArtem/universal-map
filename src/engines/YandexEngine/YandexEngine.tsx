import React, { FC, useEffect, useRef, useState } from "react";
import styles from "./YandexEngine.module.scss";
import { DrawActionType } from "../drawActionType";

declare global {
  interface Window {
    ymaps?: any;
  }
}

let yandexMapsPromise: Promise<void> | null = null;

const loadYandexMaps = (apiKey: string): Promise<void> => {
  if (yandexMapsPromise) return yandexMapsPromise;

  yandexMapsPromise = new Promise((resolve, reject) => {
    if (window.ymaps && window.ymaps.ready) {
      window.ymaps.ready(resolve);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      if (window.ymaps?.ready) window.ymaps.ready(resolve);
      else reject(new Error("Yandex Maps failed to load"));
    };
    script.onerror = () => reject(new Error("Failed to load Yandex Maps"));

    document.head.appendChild(script);
  });

  return yandexMapsPromise;
};

interface YandexEngineProps {
  providerId: string;
  drawActionType?: DrawActionType;
  markerIconUrl?: string;
}

const DEFAULT_CENTER: [number, number] = [55.7558, 37.6173];
const DEFAULT_ZOOM = 10;

const YandexEngine: FC<YandexEngineProps> = ({ providerId, drawActionType, markerIconUrl }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const drawActionRef = useRef(drawActionType);
  const nextIdRef = useRef(1);
  const styleTagRef = useRef<HTMLStyleElement | null>(null);
  const containerIdRef = useRef<string | null>(null);

  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | undefined>();

  useEffect(() => {
    drawActionRef.current = drawActionType;
  }, [drawActionType]);

  useEffect(() => {
    const apiKey = (import.meta.env as any).VITE_YANDEX_API_KEY;
    if (!apiKey || !containerRef.current) return;

    if (!containerIdRef.current) {
      containerIdRef.current = `yandex-map-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      containerRef.current.id = containerIdRef.current;
    }

    let isUnmounted = false;

    const initializeMap = async () => {
      try {
        await loadYandexMaps(apiKey);
        if (isUnmounted || !containerRef.current) return;

        const mapType =
          providerId === "YandexSatellite"
            ? "yandex#satellite"
            : providerId === "YandexHybrid"
            ? "yandex#hybrid"
            : "yandex#map";

        const map =
          mapRef.current ||
          new window.ymaps.Map(containerRef.current, {
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            type: mapType,
            controls: [],
          });

        mapRef.current = map;
        map.setType(mapType);

        if (!(map as any)._clickHandler) {
          const handleClick = (e: any) => {
            const coords: [number, number] = e.get("coords");

            if (drawActionRef.current === DrawActionType.MARKER) {
              const newMarker: GeoJSON.Feature<GeoJSON.Point> = {
                type: "Feature",
                geometry: { type: "Point", coordinates: coords },
                properties: { id: nextIdRef.current++, type: "marker" },
              };
              setGeoData((prev) => ({
                type: "FeatureCollection",
                features: [...(prev?.features || []), newMarker],
              }));
            }

            if (drawActionRef.current === DrawActionType.POLYLINE) {
              setGeoData((prev) => {
                const features = prev?.features || [];
                const lastIndex = features.findIndex(
                  (f) => f.properties?.id === "active-polyline" && f.geometry.type === "LineString"
                );

                const coordsArray =
                  lastIndex !== -1
                    ? [...(features[lastIndex].geometry as GeoJSON.LineString).coordinates, coords]
                    : [coords];

                const newPolyline: GeoJSON.Feature<GeoJSON.LineString> = {
                  type: "Feature",
                  geometry: { type: "LineString", coordinates: coordsArray },
                  properties: { id: "active-polyline", type: "polyline" },
                };

                const updatedFeatures = features.filter((f) => f.properties?.id !== "active-polyline");
                return { type: "FeatureCollection", features: [...updatedFeatures, newPolyline] };
              });
            }
          };

          map.events.add("click", handleClick);
          (map as any)._clickHandler = handleClick;
        }
      } catch (error) {
        console.error("Yandex Maps initialization error:", error);
      }
    };

    initializeMap();

    return () => {
      isUnmounted = true;
      const map = mapRef.current;
      if (map && (map as any)._clickHandler) {
        map.events.remove("click", (map as any)._clickHandler);
        (map as any)._clickHandler = null;
      }
    };
  }, [providerId, markerIconUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoData) return;

    markersRef.current.forEach((m) => map.geoObjects.remove(m));
    markersRef.current = [];

    geoData.features.forEach((feature) => {
      if (feature.geometry.type === "Point") {
        const placemark = new window.ymaps.Placemark(
          feature.geometry.coordinates,
          {},
          {
            iconLayout: "default#image",
            iconImageHref: markerIconUrl || "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
            iconImageSize: [32, 32],
            draggable: true,
          }
        );
        map.geoObjects.add(placemark);
        markersRef.current.push(placemark);
      }

      if (feature.geometry.type === "LineString") {
        const polyline = new window.ymaps.Polyline(
          feature.geometry.coordinates,
          {},
          { strokeColor: "#FF0000", strokeWidth: 3, strokeOpacity: 1 }
        );
        map.geoObjects.add(polyline);
        markersRef.current.push(polyline);

        (feature.geometry.coordinates as [number, number][]).forEach((coord) => {
          const squarePlacemark = new window.ymaps.Placemark(
            coord,
            {},
            {
              iconLayout: "default#image",
              iconImageHref:
                'data:image/svg+xml;charset=UTF-8,' +
                encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
                    <rect width="10" height="10" fill="white" stroke="black" stroke-width="1"/>
                  </svg>
                `),
              iconImageSize: [10, 10],
              iconImageOffset: [-5, -5],
              draggable: false,
            }
          );
          map.geoObjects.add(squarePlacemark);
          markersRef.current.push(squarePlacemark);
        });
      }
    });
  }, [geoData, markerIconUrl]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !containerIdRef.current) return;

    if (!styleTagRef.current) {
      const styleTag = document.createElement("style");
      document.head.appendChild(styleTag);
      styleTagRef.current = styleTag;
    }

    const cursorStyle = drawActionRef.current === DrawActionType.POLYLINE ? "crosshair" : "grab";
    styleTagRef.current.innerHTML = `
      #${containerIdRef.current} .ymaps-2-1-79-map,
      #${containerIdRef.current} .ymaps-2-1-79-map * {
        cursor: ${cursorStyle} !important;
      }
    `;
  }, [drawActionType]);

  return <div ref={containerRef} className={styles.mapContainer} />;
};

export default YandexEngine;
