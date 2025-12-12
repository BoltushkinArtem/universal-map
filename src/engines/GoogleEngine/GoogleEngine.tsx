import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import styles from "./GoogleEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData } from "../geoDataType";
import { normalizeGeoData } from "../../utils/geoDataNormalizer";
import { updateGeoData } from "../../utils/updateGeoData";
import { GoogleGeoRenderer } from "./GoogleGeoRenderer";

declare global {
  interface Window {
    google: typeof google;
  }
}

/** Props компонента GoogleEngine */
interface GoogleEngineProps {
  /** Идентификатор провайдера карты (GoogleSatellite или GoogleRoadmap) */
  providerId: string;
  /** Текущий тип действия рисования */
  drawActionType?: DrawActionType;
  /** URL иконки маркера */
  markerIconUrl?: string;
  /** Временные геоданные для рендеринга */
  tempGeoData: GeoData;
  /** Сохранённые геоданные для рендеринга */
  savedGeoData: GeoData;
  /** Callback для обновления геоданных */
  onUpdateGeoData: (data: GeoData) => void;
}

/** Асинхронная загрузка Google Maps API */
async function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  if (window.google?.maps) return window.google;

  return new Promise<typeof google>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

/** 
 * Компонент GoogleEngine — отображает карту Google с поддержкой рисования и рендеринга геоданных
 */
const GoogleEngine: FC<GoogleEngineProps> = ({
  providerId,
  drawActionType,
  markerIconUrl,
  tempGeoData,
  savedGeoData,
  onUpdateGeoData,
}) => {
  /** Контейнер для карты */
  const containerRef = useRef<HTMLDivElement | null>(null);
  /** Ссылка на объект карты Google */
  const mapRef = useRef<google.maps.Map | null>(null);

  /** Ссылки на маркеры точек */
  const pointMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  /** Ссылки на полилинии */
  const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
  /** Ссылки на маркеры вершин полилиний */
  const polylineVertexMarkersRef = useRef<Map<string, google.maps.Marker[]>>(new Map());

  /** Ссылка на слушатель клика по карте */
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  /** Текущий тип действия рисования */
  const drawActionRef = useRef(drawActionType);
  /** Временные геоданные */
  const tempGeoDataRef = useRef(tempGeoData);

  /** Ссылка на тег <style> для курсора */
  const styleTagRef = useRef<HTMLStyleElement | null>(null);
  /** ID контейнера карты */
  const containerIdRef = useRef<string | null>(null);

  /** Состояние готовности карты */
  const [mapReady, setMapReady] = useState(false);

  // --- Обновление ссылки на текущее действие рисования ---
  useEffect(() => {
    drawActionRef.current = drawActionType;
    updateCursor();
  }, [drawActionType]);

  // --- Обновление временных геоданных ---
  useEffect(() => {
    tempGeoDataRef.current = tempGeoData;
  }, [tempGeoData]);

  // --- Инициализация карты Google ---
  useEffect(() => {
    const apiKey = (import.meta.env as any).VITE_GOOGLE_API_KEY;
    if (!apiKey || !containerRef.current) return;

    if (!containerIdRef.current) {
      containerIdRef.current = `google-map-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      containerRef.current.id = containerIdRef.current;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const google = await loadGoogleMaps(apiKey);
        if (cancelled || !containerRef.current) return;

        mapRef.current = new google.maps.Map(containerRef.current, {
          center: { lat: 55.75, lng: 37.61 },
          zoom: 10,
          mapTypeId: providerId === "GoogleSatellite" ? "satellite" : "roadmap",
          disableDefaultUI: true,
        });

        // Устанавливаем состояние готовности после полной загрузки карты
        google.maps.event.addListenerOnce(mapRef.current, "idle", () => setMapReady(true));

        // Подписка на клик по карте
        clickListenerRef.current = mapRef.current.addListener("click", handleMapClick);
      } catch (e) {
        console.error("Google init failed", e);
      }
    };

    init();

    return () => {
      cancelled = true;
      cleanupMap();
    };
  }, [providerId]);

  /**
   * Обработчик клика по карте
   * @param event Событие клика карты Google
   */
  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;

      const coords: [number, number] = [event.latLng.lng(), event.latLng.lat()];
      const updated = updateGeoData(
        normalizeGeoData(tempGeoDataRef.current),
        coords,
        drawActionRef.current as DrawActionType
      );
      onUpdateGeoData(updated);
    },
    [onUpdateGeoData]
  );

  /** Очистка карты и удаление всех элементов */
  const cleanupMap = () => {
    clickListenerRef.current?.remove();
    clickListenerRef.current = null;

    pointMarkersRef.current.forEach(m => m.setMap(null));
    pointMarkersRef.current.clear();

    polylinesRef.current.forEach(l => l.setMap(null));
    polylinesRef.current.clear();

    polylineVertexMarkersRef.current.forEach(arr => arr.forEach(m => m.setMap(null)));
    polylineVertexMarkersRef.current.clear();

    if (styleTagRef.current?.parentNode) styleTagRef.current.parentNode.removeChild(styleTagRef.current);
  };

  /** Обновление курсора карты в зависимости от текущего действия */
  const updateCursor = () => {
    const containerId = containerIdRef.current;
    if (!containerId) return;

    let style = styleTagRef.current;
    if (!style) {
      style = document.createElement("style");
      styleTagRef.current = style;
      document.head.appendChild(style);
    }

    style.innerHTML = `
      #${containerId} .gm-style,
      #${containerId} .gm-style * {
        cursor: ${drawActionRef.current ? "crosshair" : "grab"} !important;
      }
    `;
  };

  return (
    <>
      <div ref={containerRef} className={styles.googleContainer} />
      {mapReady && mapRef.current && (
        <GoogleGeoRenderer
          map={mapRef.current}
          tempGeoData={tempGeoData}
          savedGeoData={savedGeoData}
          markerIconUrl={markerIconUrl}
          pointMarkersRef={pointMarkersRef}
          polylinesRef={polylinesRef}
          polylineVertexMarkersRef={polylineVertexMarkersRef}
        />
      )}
    </>
  );
};

export default GoogleEngine;
