import React, { FC, useEffect, useRef, useState } from "react";
import styles from "./GoogleEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData, GeoFeature } from "../geoDataType";

declare global {
    interface Window {
        google: typeof google;
    }
}

interface GoogleEngineProps {
    providerId: string;
    drawActionType?: DrawActionType;
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

const GoogleEngine: FC<GoogleEngineProps> = ({ providerId, drawActionType, markerIconUrl }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    /** Отдельные маркеры точек */
    const pointMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());

    /** Квадратики LineString */
    const polylinePointMarkersRef = useRef<google.maps.Marker[]>([]);

    /** Одна глобальная polyline */
    const polylineRef = useRef<google.maps.Polyline | null>(null);

    const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
    const styleTagRef = useRef<HTMLStyleElement | null>(null);
    const containerIdRef = useRef<string | null>(null);

    const drawActionRef = useRef(drawActionType);

    const [geoData, setGeoData] = useState<GeoData>({
        type: "FeatureCollection",
        features: [],
    });

    useEffect(() => {
        drawActionRef.current = drawActionType;
    }, [drawActionType]);

    /** Инициализация карты */
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

                /** Создаём polyline один раз */
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

                /** Обработка кликов */
                clickListenerRef.current = map.addListener("click", (event: google.maps.MapMouseEvent) => {
                    if (!event.latLng) return;
                    const coords: [number, number] = [event.latLng.lng(), event.latLng.lat()];

                    setGeoData((prev) => {
                        switch (drawActionRef.current) {
                            case DrawActionType.MARKER: {
                                const newFeature: GeoFeature = {
                                    type: "Feature",
                                    geometry: { type: "Point", coordinates: coords },
                                    properties: {
                                        id: String(prev.features.length + 1),
                                        type: "marker",
                                    },
                                };
                                return { ...prev, features: [...prev.features, newFeature] };
                            }

                            case DrawActionType.POLYLINE: {
                                const lastIndex = prev.features.findIndex(
                                    (f) =>
                                        f.properties.id === "active-polyline" &&
                                        f.geometry.type === "LineString"
                                );

                                let updated: GeoFeature;

                                if (lastIndex !== -1) {
                                    const existing = prev.features[lastIndex];
                                    updated = {
                                        ...existing,
                                        geometry: {
                                            type: "LineString",
                                            coordinates: [
                                                ...(existing.geometry as GeoJSON.LineString).coordinates,
                                                coords,
                                            ],
                                        },
                                    };
                                } else {
                                    updated = {
                                        type: "Feature",
                                        geometry: {
                                            type: "LineString",
                                            coordinates: [coords],
                                        },
                                        properties: {
                                            id: "active-polyline",
                                            type: "polyline",
                                        },
                                    };
                                }

                                const other = prev.features.filter(
                                    (f) => f.properties.id !== "active-polyline"
                                );
                                return { ...prev, features: [...other, updated] };
                            }

                            default:
                                return prev;
                        }
                    });
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

            pointMarkersRef.current.forEach((m) => m.setMap(null));
            pointMarkersRef.current.clear();

            polylinePointMarkersRef.current.forEach((m) => m.setMap(null));
            polylinePointMarkersRef.current = [];

            polylineRef.current?.setMap(null);
            polylineRef.current = null;

            if (styleTagRef.current?.parentNode) {
                styleTagRef.current.parentNode.removeChild(styleTagRef.current);
            }
        };
    }, [providerId]);

    /** Обновление визуализации без пересоздания старых элементов */
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        /** ---------- 1. РЕНДЕР ТОЧЕК (MARKER) ---------- */
        const markerFeatures = geoData.features.filter((f) => f.properties.type === "marker");
        for (const feature of markerFeatures) {
            if (feature.geometry.type !== "Point") continue;
            const id = feature.properties.id;
            if (!pointMarkersRef.current.has(id)) {
                const marker = new google.maps.Marker({
                    position: new google.maps.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]),
                    map,
                    icon: markerIconUrl ? { url: markerIconUrl, scaledSize: new google.maps.Size(32, 32) } : undefined,
                });
                pointMarkersRef.current.set(id, marker);
            }
        }

        /** ---------- 2. РЕНДЕР ПОЛИЛИНИИ ---------- */
        const polyFeature = geoData.features.find((f) => f.properties.type === "polyline");
        if (!polyFeature || polyFeature.geometry.type !== "LineString") return;

        const coords = polyFeature.geometry.coordinates;
        const path = coords.map(([lng, lat]) => new google.maps.LatLng(lat, lng));
        polylineRef.current?.setPath(path);

        /** ---------- 3. ДОБАВЛЕНИЕ НОВЫХ КВАДРАТИКОВ ПОЛИЛИНИИ ---------- */
        const existingCount = polylinePointMarkersRef.current.length;
        for (let i = existingCount; i < coords.length; i++) {
            const [lng, lat] = coords[i];
            const squareMarker = new google.maps.Marker({
                position: new google.maps.LatLng(lat, lng),
                map,
                icon: {
                    url:
                        "data:image/svg+xml;charset=UTF-8," +
                        encodeURIComponent(`
                            <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg">
                                <rect width="10" height="10" fill="white" stroke="black" stroke-width="1"/>
                            </svg>
                        `),
                    scaledSize: new google.maps.Size(10, 10),
                },
                clickable: false,
            });
            polylinePointMarkersRef.current.push(squareMarker);
        }
    }, [geoData, markerIconUrl]);

    /** Курсор */
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

        const cursor = drawActionRef.current ? "crosshair" : "grab";

        styleTag.innerHTML = `
            #${containerId} .gm-style,
            #${containerId} .gm-style * {
                cursor: ${cursor} !important;
            }
        `;
    }, [drawActionType]);

    return <div ref={containerRef} className={styles.googleContainer} />;
};

export default GoogleEngine;
