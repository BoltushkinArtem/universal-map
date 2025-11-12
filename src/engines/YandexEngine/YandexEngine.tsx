import React, { FC, useEffect, useRef } from "react";
import styles from "./YandexEngine.module.scss";

declare global {
  interface Window {
    ymaps?: any;
  }
}

let yandexMapsPromise: Promise<void> | null = null;

const loadYandexMaps = (apiKey: string): Promise<void> => {
  if (yandexMapsPromise) return yandexMapsPromise;

  yandexMapsPromise = new Promise((resolve, reject) => {
    if (window.ymaps && window.ymaps.ready) return window.ymaps.ready(() => resolve());

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;
    script.onload = () =>
      window.ymaps?.ready ? window.ymaps.ready(() => resolve()) : reject(new Error("ymaps not loaded"));
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
  const styleTagRef = useRef<HTMLStyleElement | null>(null);
  const containerIdRef = useRef<string | null>(null);

  // храним актуальные значения draw-флагов в ref
  const drawMarkerRef = useRef(drawMarkerOn);
  const drawPolylineRef = useRef(drawPolylineOn);

  useEffect(() => {
    drawMarkerRef.current = drawMarkerOn;
  }, [drawMarkerOn]);

  useEffect(() => {
    drawPolylineRef.current = drawPolylineOn;
  }, [drawPolylineOn]);

  // === Инициализация карты один раз ===
  useEffect(() => {
    const apiKey = (import.meta.env as any).VITE_YANDEX_API_KEY;
    if (!apiKey || !containerRef.current) return;

    if (!containerIdRef.current) {
      containerIdRef.current = `yandex-map-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      containerRef.current.id = containerIdRef.current;
    }

    let unmounted = false;

    const initMap = async () => {
      try {
        await loadYandexMaps(apiKey);
        if (unmounted || !containerRef.current) return;

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

        // Слой для polyline создаем один раз
        if (!polylineRef.current) {
          polylineRef.current = new window.ymaps.Polyline([], {
            strokeColor: "#FF0000",
            strokeWidth: 3,
            strokeOpacity: 1,
          });
          map.geoObjects.add(polylineRef.current);
        }

        // Клик — используем один обработчик и актуальные draw-флаги через ref
        if (!(map as any)._clickHandler) {
          const handleClick = (e: any) => {
            const coords = e.get("coords");

            if (drawMarkerRef.current) {
              const placemark = new window.ymaps.Placemark(
                coords,
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

            if (drawPolylineRef.current && polylineRef.current) {
              polylinePathRef.current.push(coords);
              polylineRef.current.geometry.setCoordinates(polylinePathRef.current);
            }
          };

          map.events.add("click", handleClick);
          (map as any)._clickHandler = handleClick;
        }
      } catch (err) {
        console.error("Yandex Maps init error:", err);
      }
    };

    initMap();

    return () => {
      unmounted = true;
      if (!mapRef.current) return;
      if ((mapRef.current as any)._clickHandler) {
        mapRef.current.events.remove("click", (mapRef.current as any)._clickHandler);
        (mapRef.current as any)._clickHandler = null;
      }
    };
  }, [providerId, markerIconUrl]); // draw-флаги убраны из зависимостей

  // === Визуальный курсор ===
  useEffect(() => {
    const container = containerRef.current;
    const containerId = containerIdRef.current;
    if (!container || !containerId) return;

    let styleTag = styleTagRef.current;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTagRef.current = styleTag;
      styleTag.type = "text/css";
      document.head.appendChild(styleTag);
    }

    const cursor = drawPolylineOn ? "crosshair" : "grab";
    styleTag.innerHTML = `
      #${containerId} .ymaps-2-1-79-map,
      #${containerId} .ymaps-2-1-79-map * {
        cursor: ${cursor} !important;
      }
    `;
  }, [drawPolylineOn]);

  return <div ref={containerRef} className={styles.mapContainer} />;
};

export default YandexEngine;
