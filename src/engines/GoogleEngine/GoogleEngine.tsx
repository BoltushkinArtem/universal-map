import React, { FC, useCallback, useEffect, useRef } from "react";
import styles from "./GoogleEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData, GeoFeature } from "../geoDataType";
import { normalizeGeoData } from "../../utils/geoDataNormalizer";
import { updateGeoData } from "../../utils/updateGeoData";

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
    onUpdateGeoData,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    const pointMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
    const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
    const polylineVertexMarkersRef = useRef<Map<string, google.maps.Marker[]>>(new Map());

    const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
    const drawActionRef = useRef(drawActionType);
    const tempGeoDataRef = useRef(tempGeoData);

    const styleTagRef = useRef<HTMLStyleElement | null>(null);
    const containerIdRef = useRef<string | null>(null);

    // --- Update refs ---
    useEffect(() => {
        drawActionRef.current = drawActionType;
        updateCursor();
    }, [drawActionType]);

    useEffect(() => {
        tempGeoDataRef.current = tempGeoData;
    }, [tempGeoData]);

    // --- Initialize map ---
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

                // --- Отрисовка после полной загрузки карты ---
                google.maps.event.addListenerOnce(mapRef.current, "idle", () => {
                    renderAllFeatures();
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
            const updated = updateGeoData(normalizeGeoData(tempGeoDataRef.current), coords, drawActionRef.current as DrawActionType);
            onUpdateGeoData(updated);
        },
        [onUpdateGeoData]
    );

    const cleanupMap = () => {
        clickListenerRef.current?.remove();
        clickListenerRef.current = null;

        pointMarkersRef.current.forEach((m) => m.setMap(null));
        pointMarkersRef.current.clear();

        polylinesRef.current.forEach((l) => l.setMap(null));
        polylinesRef.current.clear();

        polylineVertexMarkersRef.current.forEach((arr) => arr.forEach((m) => m.setMap(null)));
        polylineVertexMarkersRef.current.clear();

        if (styleTagRef.current?.parentNode) styleTagRef.current.parentNode.removeChild(styleTagRef.current);
    };

    // --- Render all features при обновлении saved/temp данных ---
    useEffect(() => {
        if (!mapRef.current) return;
        renderAllFeatures();
    }, [savedGeoData, tempGeoData, markerIconUrl]);

    const renderAllFeatures = () => {
        const map = mapRef.current;
        if (!map) return;

        const allGeo = normalizeGeoData({
            type: "FeatureCollection",
            features: [...(savedGeoData?.features ?? []), ...(tempGeoData?.features ?? [])],
        });

        // --- POINT MARKERS ---
        const points = allGeo.features.filter((f) => f.properties.type === "marker");
        const pointIds = new Set(points.map((f) => f.properties.id));
        pointMarkersRef.current.forEach((m, id) => {
            if (!pointIds.has(id)) {
                m.setMap(null);
                pointMarkersRef.current.delete(id);
            }
        });
        points.forEach((f) => {
            const id = f.properties.id;
            if (!pointMarkersRef.current.has(id)) {
                const [lng, lat] = f.geometry.coordinates as [number, number];
                const m = new google.maps.Marker({
                    position: new google.maps.LatLng(lat, lng),
                    map,
                    icon: markerIconUrl
                        ? { url: markerIconUrl, scaledSize: new google.maps.Size(32, 32) }
                        : undefined,
                });
                pointMarkersRef.current.set(id, m);
            }
        });

        // --- POLYLINES + VERTEX MARKERS ---
        const lines = allGeo.features.filter(
            (f) => f.properties.type === "polyline" && f.geometry.type === "LineString"
        );
        const lineIds = new Set(lines.map((f) => f.properties.id));

        Array.from(polylinesRef.current.keys()).forEach((id) => {
            if (!lineIds.has(id)) {
                polylinesRef.current.get(id)?.setMap(null);
                polylinesRef.current.delete(id);
                polylineVertexMarkersRef.current.get(id)?.forEach((m) => m.setMap(null));
                polylineVertexMarkersRef.current.delete(id);
            }
        });

        lines.forEach((line) => {
            const id = line.properties.id;
            const coords = line.geometry.coordinates as [number, number][];

            let polyline = polylinesRef.current.get(id);
            if (!polyline) {
                polyline = new google.maps.Polyline({
                    map,
                    path: coords.map(([lng, lat]) => new google.maps.LatLng(lat, lng)),
                    strokeColor: "#FF0000",
                    strokeOpacity: 1,
                    strokeWeight: 3,
                });
                polylinesRef.current.set(id, polyline);
            } else {
                polyline.setPath(coords.map(([lng, lat]) => new google.maps.LatLng(lat, lng)));
            }

            // Vertex markers
            let markers = polylineVertexMarkersRef.current.get(id) || [];
            for (let i = markers.length; i < coords.length; i++) {
                const [lng, lat] = coords[i];
                const m = new google.maps.Marker({
                    position: new google.maps.LatLng(lat, lng),
                    map,
                    icon: {
                        url:
                            "data:image/svg+xml;charset=UTF-8," +
                            encodeURIComponent(`
                <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg">
                  <rect width="10" height="10" fill="white" stroke="black" stroke-width="1"/>
                </svg>`),
                        scaledSize: new google.maps.Size(10, 10),
                    },
                    clickable: false,
                });
                markers.push(m);
            }
            polylineVertexMarkersRef.current.set(id, markers);
        });
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