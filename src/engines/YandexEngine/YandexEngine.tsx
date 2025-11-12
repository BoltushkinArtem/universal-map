import React, { FC, useEffect, useRef } from "react";
import styles from "./YandexEngine.module.scss";

declare global {
  interface Window {
    ymaps?: any;
  }
}

// Глобальный promise для загрузки Yandex Maps
let yandexMapsPromise: Promise<void> | null = null;

// Функция загрузки Yandex Maps
const loadYandexMaps = (apiKey: string): Promise<void> => {
  if (yandexMapsPromise) return yandexMapsPromise;

  yandexMapsPromise = new Promise((resolve, reject) => {
    if (window.ymaps && window.ymaps.ready) {
      window.ymaps.ready(() => resolve());
      return;
    }

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;

    script.onload = () =>
      window.ymaps?.ready ? window.ymaps.ready(() => resolve()) : reject(new Error("Yandex Maps failed to load"));
    script.onerror = () => reject(new Error("Failed to load Yandex Maps"));

    document.head.appendChild(script);
  });

  return yandexMapsPromise;
};

interface YandexEngineProps {
  providerId: string;
  drawMarkerOn?: boolean;
  drawPolylineOn?: boolean;
  markerIconUrl?: string;
}

const YandexEngine: FC<YandexEngineProps> = ({
  providerId,
  drawMarkerOn = false,
  drawPolylineOn = false,
  markerIconUrl,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const polylinePathRef = useRef<number[][]>([]);
  const containerIdRef = useRef<string | null>(null);
  const styleTagRef = useRef<HTMLStyleElement | null>(null);

  const drawMarkerRef = useRef(drawMarkerOn);
  const drawPolylineRef = useRef(drawPolylineOn);

  useEffect(() => {
    drawMarkerRef.current = drawMarkerOn;
  }, [drawMarkerOn]);

  useEffect(() => {
    drawPolylineRef.current = drawPolylineOn;
  }, [drawPolylineOn]);

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
            center: [55.7558, 37.6173],
            zoom: 10,
            type: mapType,
            controls: [],
          });

        mapRef.current = map;
        map.setType(mapType);

        if (!polylineRef.current) {
          polylineRef.current = new window.ymaps.Polyline([], {
            strokeColor: "#FF0000",
            strokeWidth: 3,
            strokeOpacity: 1,
          });
          map.geoObjects.add(polylineRef.current);
          polylineRef.current.options.set({
            strokeColor: "#FF0000",
            strokeWidth: 3,
            strokeOpacity: 1,
          });
        }

        if (!(map as any)._clickHandler) {
          const handleClick = (e: any) => {
            const coords = e.get("coords");

            if (drawMarkerRef.current && !drawPolylineRef.current) {
              const placemark = new window.ymaps.Placemark(coords, {}, {
                iconLayout: "default#image",
                iconImageHref: markerIconUrl || "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                iconImageSize: [32, 32],
                draggable: true,
              });
              map.geoObjects.add(placemark);
              markersRef.current.push(placemark);
            }

            if (drawPolylineRef.current && polylineRef.current) {
              const squarePlacemark = new window.ymaps.Placemark(
                coords,
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

              polylinePathRef.current.push(coords);
              polylineRef.current.geometry.setCoordinates([...polylinePathRef.current]);
              polylineRef.current.options.set({
                strokeColor: "#FF0000",
                strokeWidth: 3,
                strokeOpacity: 1,
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
      if (!mapRef.current) return;
      if ((mapRef.current as any)._clickHandler) {
        mapRef.current.events.remove("click", (mapRef.current as any)._clickHandler);
        (mapRef.current as any)._clickHandler = null;
      }
    };
  }, [providerId, markerIconUrl]);

  useEffect(() => {
    const container = containerRef.current;
    const containerId = containerIdRef.current;
    if (!container || !containerId) return;

    if (!styleTagRef.current) {
      const styleTag = document.createElement("style");
      document.head.appendChild(styleTag);
      styleTagRef.current = styleTag;
    }

    const cursorStyle = drawPolylineOn ? "crosshair" : "grab";
    styleTagRef.current.innerHTML = `
      #${containerId} .ymaps-2-1-79-map,
      #${containerId} .ymaps-2-1-79-map * {
        cursor: ${cursorStyle} !important;
      }
    `;
  }, [drawPolylineOn]);

  return <div ref={containerRef} className={styles.mapContainer} />;
};

export default YandexEngine;
