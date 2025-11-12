import React, { FC, useEffect, useRef } from "react";
import styles from "./GoogleEngine.module.scss";

// Расширяем глобальный объект Window для корректной типизации google.maps
declare global {
  interface Window {
    google: typeof google;
  }
}

interface GoogleEngineProps {
  /** Идентификатор провайдера карты */
  providerId: string;
  /** Включает возможность добавления маркеров на карту */
  drawMarkerOn?: boolean;
  /** URL иконки маркера */
  markerIconUrl?: string;
}

/**
 * Динамическая загрузка Google Maps API
 */
async function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  if (window.google?.maps) return window.google;

  return new Promise<typeof google>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google));
      existingScript.addEventListener("error", () =>
        reject(new Error("Google Maps failed to load"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

/**
 * GoogleEngine отображает карту Google с возможностью добавления маркеров.
 */
const GoogleEngine: FC<GoogleEngineProps> = ({
  providerId,
  drawMarkerOn = false,
  markerIconUrl,
}) => {
  // Ссылка на контейнер DOM для карты
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Ссылка на экземпляр карты Google
  const mapRef = useRef<google.maps.Map | null>(null);

  // Список маркеров для управления ими
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    const apiKey = (import.meta.env as any).VITE_GOOGLE_API_KEY;
    if (!apiKey || !containerRef.current) return;

    let cancelled = false;
    let clickListener: google.maps.MapsEventListener | null = null;

    /**
     * Инициализация карты Google
     */
    const initializeMap = async () => {
      try {
        const google = await loadGoogleMaps(apiKey);
        if (cancelled || !containerRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
          center: { lat: 55.7558, lng: 37.6173 }, // Москва
          zoom: 10,
          mapTypeId: providerId === "GoogleSatellite" ? "satellite" : "roadmap",
          disableDefaultUI: true,
        });
        mapRef.current = map;

        // Добавление маркеров по клику
        if (drawMarkerOn) {
          clickListener = map.addListener("click", (event: google.maps.MapMouseEvent) => {
            if (!event.latLng) return;

            const marker = new google.maps.Marker({
              position: event.latLng,
              map,
              icon: markerIconUrl
                ? { url: markerIconUrl, scaledSize: new google.maps.Size(32, 32) }
                : undefined,
            });

            markersRef.current.push(marker);
          });
        }
      } catch (error) {
        console.error("Google Maps initialization failed:", error);
      }
    };

    initializeMap();

    // Очистка карты и маркеров при размонтировании
    return () => {
      cancelled = true;

      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];

      if (clickListener) {
        google.maps.event.removeListener(clickListener);
      }

      mapRef.current = null;
    };
  }, [providerId, drawMarkerOn, markerIconUrl]);

  return <div ref={containerRef} className={styles.googleContainer} />;
};

export default GoogleEngine;
