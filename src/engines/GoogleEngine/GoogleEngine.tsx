import React, { FC, useEffect, useRef } from "react";
import styles from "./GoogleEngine.module.scss";

declare global {
    interface Window {
        google: typeof google;
    }
}

interface GoogleEngineProps {
    providerId: string;
    drawMarkerOn?: boolean;
    drawPolylineOn?: boolean;
    markerIconUrl?: string;
}

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

const GoogleEngine: FC<GoogleEngineProps> = ({
    providerId,
    drawMarkerOn = false,
    drawPolylineOn = false,
    markerIconUrl,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const polylineRef = useRef<google.maps.Polyline | null>(null);
    const polylinePathRef = useRef<google.maps.LatLng[]>([]);
    const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
    const styleTagRef = useRef<HTMLStyleElement | null>(null);
    const containerIdRef = useRef<string | null>(null);

    const drawMarkerRef = useRef(drawMarkerOn);
    const drawPolylineRef = useRef(drawPolylineOn);

    useEffect(() => {
        drawMarkerRef.current = drawMarkerOn;
    }, [drawMarkerOn]);

    useEffect(() => {
        drawPolylineRef.current = drawPolylineOn;
    }, [drawPolylineOn]);

    // --- Инициализация карты один раз ---
    useEffect(() => {
        const apiKey = (import.meta.env as any).VITE_GOOGLE_API_KEY;
        if (!apiKey || !containerRef.current) return;

        if (!containerIdRef.current) {
            containerIdRef.current = `google-map-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            containerRef.current.id = containerIdRef.current;
        }

        let cancelled = false;

        const initializeMap = async () => {
            try {
                const google = await loadGoogleMaps(apiKey);
                if (cancelled || !containerRef.current) return;

                const map = new google.maps.Map(containerRef.current, {
                    center: { lat: 55.7558, lng: 37.6173 },
                    zoom: 10,
                    mapTypeId: providerId === "GoogleSatellite" ? "satellite" : "roadmap",
                    disableDefaultUI: true,
                });
                mapRef.current = map;

                if (!polylineRef.current) {
                    polylineRef.current = new google.maps.Polyline({
                        path: [],
                        geodesic: true,
                        strokeColor: "#FF0000",
                        strokeOpacity: 1.0,
                        strokeWeight: 3,
                        map,
                    });
                }

                clickListenerRef.current = map.addListener("click", (event: google.maps.MapMouseEvent) => {
                    if (!event.latLng) return;

                    // drawPolylineOn — маленький белый квадратик
                    if (drawPolylineRef.current) {
                        const squareEl = document.createElement("div");
                        squareEl.style.width = "10px";
                        squareEl.style.height = "10px";
                        squareEl.style.backgroundColor = "white";
                        squareEl.style.border = "1px solid black"; // контур для видимости
                        squareEl.style.borderRadius = "2px"; // чуть округлим уголки
                        squareEl.style.boxSizing = "border-box";

                        const marker = new google.maps.Marker({
                            position: event.latLng,
                            map,
                            icon: {
                                url: '', // не используем картинку
                            },
                            clickable: false,
                        });
                        // Вместо icon используем кастомный элемент
                        marker.setIcon({
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg">
                                  <rect width="10" height="10" fill="white" stroke="black" stroke-width="1"/>
                                </svg>
                              `),
                            scaledSize: new google.maps.Size(10, 10)
                        });

                        markersRef.current.push(marker);

                        // Обновляем путь полилинии
                        polylinePathRef.current.push(event.latLng);
                        polylineRef.current?.setPath(polylinePathRef.current);

                        return; // при drawPolylineOn мы не добавляем обычный маркер
                    }

                    // drawMarkerOn — обычный маркер
                    if (drawMarkerRef.current) {
                        const marker = new google.maps.Marker({
                            position: event.latLng,
                            map,
                            icon: markerIconUrl
                                ? { url: markerIconUrl, scaledSize: new google.maps.Size(32, 32) }
                                : undefined,
                        });
                        markersRef.current.push(marker);
                    }
                });

            } catch (error) {
                console.error("Google Maps initialization failed:", error);
            }
        };

        initializeMap();

        return () => {
            cancelled = true;
            clickListenerRef.current?.remove();
            clickListenerRef.current = null;
            markersRef.current.forEach((m) => m.setMap(null));
            markersRef.current = [];
            polylineRef.current?.setMap(null);
            polylineRef.current = null;
            polylinePathRef.current = [];
            mapRef.current = null;
            if (styleTagRef.current?.parentNode) {
                styleTagRef.current.parentNode.removeChild(styleTagRef.current);
                styleTagRef.current = null;
            }
        };
    }, [providerId]);

    // --- Динамический визуальный курсор через инъекцию CSS ---
    useEffect(() => {
        const containerId = containerIdRef.current;
        if (!containerId) return;

        let styleTag = styleTagRef.current;
        if (!styleTag) {
            styleTag = document.createElement("style");
            styleTag.type = "text/css";
            styleTagRef.current = styleTag;
            document.head.appendChild(styleTag);
        }

        const cursor = drawPolylineOn ? "crosshair" : "grab";
        styleTag.innerHTML = `
      #${containerId} .gm-style,
      #${containerId} .gm-style * {
        cursor: ${cursor} !important;
      }
    `;
    }, [drawPolylineOn]);

    return <div ref={containerRef} className={styles.googleContainer} />;
};

export default GoogleEngine;
