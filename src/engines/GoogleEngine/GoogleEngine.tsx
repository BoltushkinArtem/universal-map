// ---- GoogleEngine.tsx (fixed with per-line polylines) ----
import React, { FC, useCallback, useEffect, useRef } from "react";
import styles from "./GoogleEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData, GeoFeature } from "../geoDataType";
import { normalizeGeoData } from "../../utils/geoDataNormalizer";

declare global {
    interface Window {
        google: typeof google;
    }
}

interface GoogleEngineProps {
    providerId: string;
    drawActionType?: DrawActionType;
    markerIconUrl?: string;
    tempGeoData: GeoData;
    savedGeoData: GeoData;
    onUpdateGeoData: (data: GeoData) => void;
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
    drawActionType,
    markerIconUrl,
    tempGeoData,
    savedGeoData,
    onUpdateGeoData
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    const pointMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
    const polylinePointMarkersRef = useRef<google.maps.Marker[]>([]);
    const polylinesRef = useRef<google.maps.Polyline[]>([]);
    const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

    const styleTagRef = useRef<HTMLStyleElement | null>(null);
    const containerIdRef = useRef<string | null>(null);

    const drawActionRef = useRef(drawActionType);
    const tempGeoDataRef = useRef(tempGeoData);

    useEffect(() => {
        drawActionRef.current = drawActionType;

        updateCursor();
    }, [drawActionType]);

    useEffect(() => {
        tempGeoDataRef.current = tempGeoData;
    }, [tempGeoData]);

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
                    disableDefaultUI: true
                });

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

    const handleMapClick = useCallback(
        (event: google.maps.MapMouseEvent) => {
            if (!event.latLng) return;
            const coords: [number, number] = [event.latLng.lng(), event.latLng.lat()];
            onUpdateGeoData(updateGeoData(tempGeoDataRef.current, coords));
        },
        [onUpdateGeoData]
    );

    const updateGeoData = (prev: GeoData | undefined, coords: [number, number]): GeoData => {
        const current = prev ?? { type: "FeatureCollection", features: [] };

        switch (drawActionRef.current) {
            case DrawActionType.MARKER: {
                const feature = normalizeGeoData({
                    type: "FeatureCollection",
                    features: [{
                        type: "Feature",
                        geometry: { type: "Point", coordinates: coords },
                        properties: { type: "marker", id: `marker-${Date.now()}`, isTemp: false }
                    }]
                }).features[0];

                return { ...current, features: [...current.features, feature] };
            }

            case DrawActionType.POLYLINE: {
                const index = current.features.findIndex(
                    f => f.properties.id === "active-polyline" && f.geometry.type === "LineString"
                );

                let updated: GeoFeature;
                if (index !== -1) {
                    const ex = current.features[index];
                    updated = {
                        ...ex,
                        geometry: {
                            type: "LineString",
                            coordinates: [...(ex.geometry as any).coordinates, coords]
                        }
                    };
                } else {
                    updated = normalizeGeoData({
                        type: "FeatureCollection",
                        features: [{
                            type: "Feature",
                            geometry: { type: "LineString", coordinates: [coords] },
                            properties: { type: "polyline", id: "active-polyline", isTemp: true }
                        }]
                    }).features[0];
                }

                return {
                    ...current,
                    features: [
                        ...current.features.filter(f => f.properties.id !== "active-polyline"),
                        updated
                    ]
                };
            }

            default:
                return current;
        }
    };

    const cleanupMap = () => {
        clickListenerRef.current?.remove();
        clickListenerRef.current = null;

        pointMarkersRef.current.forEach(m => m.setMap(null));
        pointMarkersRef.current.clear();

        polylinePointMarkersRef.current.forEach(m => m.setMap(null));
        polylinePointMarkersRef.current = [];

        polylinesRef.current.forEach(l => l.setMap(null));
        polylinesRef.current = [];

        if (styleTagRef.current?.parentNode) {
            styleTagRef.current.parentNode.removeChild(styleTagRef.current);
        }
    };

    useEffect(() => {
        renderMarkersAndPolylines();
    }, [savedGeoData, tempGeoData, markerIconUrl]);

    const renderMarkersAndPolylines = () => {
        const map = mapRef.current;
        if (!map) return;

        const finalGeo = normalizeGeoData({
            type: "FeatureCollection",
            features: [
                ...(savedGeoData?.features ?? []),
                ...(tempGeoData?.features ?? [])
            ]
        });

        pointMarkersRef.current.forEach(m => m.setMap(null));
        pointMarkersRef.current.clear();
        polylinePointMarkersRef.current.forEach(m => m.setMap(null));
        polylinePointMarkersRef.current = [];
        polylinesRef.current.forEach(l => l.setMap(null));
        polylinesRef.current = [];

        const markers = finalGeo.features.filter(f => f.properties.type === "marker");
        for (const feature of markers) {
            const [lng, lat] = feature.geometry.coordinates as [number, number];
            const id = feature.properties.id;

            const m = new google.maps.Marker({
                position: new google.maps.LatLng(lat, lng),
                map,
                icon: markerIconUrl
                    ? { url: markerIconUrl, scaledSize: new google.maps.Size(32, 32) }
                    : undefined
            });

            pointMarkersRef.current.set(id, m);
        }

        const lines = finalGeo.features.filter(f => f.properties.type === "polyline");

        for (const line of lines) {
            if (line.geometry.type !== "LineString") continue;

            const coords = line.geometry.coordinates as [number, number][];
            const path = coords.map(([lng, lat]) => new google.maps.LatLng(lat, lng));

            const polyline = new google.maps.Polyline({
                map,
                path,
                strokeColor: "#FF0000",
                strokeOpacity: 1,
                strokeWeight: 3
            });

            polylinesRef.current.push(polyline);

            for (const [lng, lat] of coords) {
                const marker = new google.maps.Marker({
                    position: new google.maps.LatLng(lat, lng),
                    map,
                    icon: {
                        url:
                            "data:image/svg+xml;charset=UTF-8," +
                            encodeURIComponent(`
                        <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg">
                            <rect width="10" height="10" fill="white" stroke="black" stroke-width="1"/>
                        </svg>`),
                        scaledSize: new google.maps.Size(10, 10)
                    },
                    clickable: false
                });

                polylinePointMarkersRef.current.push(marker);
            }
        }
    };

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

    return <div ref={containerRef} className={styles.googleContainer} />;
};

export default GoogleEngine;