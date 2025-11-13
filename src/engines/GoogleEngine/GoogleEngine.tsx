import React, { FC, useEffect, useRef, useState, useCallback } from "react";
import styles from "./GoogleEngine.module.scss";
import { DrawActionType } from "../drawActionType";

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

type GeoFeature = GeoJSON.Feature<GeoJSON.Point | GeoJSON.LineString>;

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
    const markersRef = useRef<google.maps.Marker[]>([]);
    const polylineRef = useRef<google.maps.Polyline | null>(null);
    const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
    const styleTagRef = useRef<HTMLStyleElement | null>(null);
    const containerIdRef = useRef<string | null>(null);

    const drawActionRef = useRef(drawActionType);
    const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection<GeoJSON.Geometry, any>>({
        type: "FeatureCollection",
        features: [],
    });

    useEffect(() => {
        drawActionRef.current = drawActionType;
    }, [drawActionType]);

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
                    if (!event.latLng) return; // ✅ защита от undefined
                    const coords: [number, number] = [event.latLng.lng(), event.latLng.lat()];

                    setGeoData((prev) => {
                        switch (drawActionRef.current) {
                            case DrawActionType.MARKER: {
                                const newFeature: GeoFeature = {
                                    type: "Feature",
                                    geometry: { type: "Point", coordinates: coords },
                                    properties: { id: prev.features.length + 1, type: "marker" },
                                };
                                return { ...prev, features: [...prev.features, newFeature] };
                            }
                            case DrawActionType.POLYLINE: {
                                const lastIndex = prev.features.findIndex(
                                    (f) => f.properties?.id === "active-polyline" && f.geometry.type === "LineString"
                                );

                                const updatedPolyline: GeoFeature =
                                    lastIndex !== -1
                                        ? {
                                            ...prev.features[lastIndex],
                                            geometry: {
                                                type: "LineString",
                                                coordinates: [
                                                    ...(prev.features[lastIndex].geometry as GeoJSON.LineString).coordinates,
                                                    coords,
                                                ],
                                            },
                                        }
                                        : {
                                            type: "Feature",
                                            geometry: { type: "LineString", coordinates: [coords] },
                                            properties: { id: "active-polyline", type: "polyline" },
                                        };

                                const features = prev.features.filter((f) => f.properties?.id !== "active-polyline");
                                return { ...prev, features: [...features, updatedPolyline] };
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
            markersRef.current.forEach((m) => m.setMap(null));
            markersRef.current = [];
            polylineRef.current?.setMap(null);
            polylineRef.current = null;
            mapRef.current = null;
            if (styleTagRef.current?.parentNode) {
                styleTagRef.current.parentNode.removeChild(styleTagRef.current);
                styleTagRef.current = null;
            }
        };
    }, [providerId]);


    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        polylineRef.current?.setPath([]);
        polylineRef.current?.setMap(map);

        geoData.features.forEach((feature) => {
            if (feature.geometry.type === "Point") {
                const marker = new google.maps.Marker({
                    position: new google.maps.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]),
                    map,
                    icon: markerIconUrl
                        ? { url: markerIconUrl, scaledSize: new google.maps.Size(32, 32) }
                        : undefined,
                });
                markersRef.current.push(marker);
            } else if (feature.geometry.type === "LineString") {
                const path = feature.geometry.coordinates.map(([lng, lat]) => new google.maps.LatLng(lat, lng));
                polylineRef.current?.setPath(path);

                path.forEach((latLng) => {
                    const squareMarker = new google.maps.Marker({
                        position: latLng,
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
                    markersRef.current.push(squareMarker);
                });
            }
        });
    }, [geoData, markerIconUrl]);

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
