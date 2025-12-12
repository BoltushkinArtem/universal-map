import React, { FC, useCallback, useEffect, useRef } from "react";
import styles from "./YandexEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData } from "../geoDataType";
import { updateGeoData } from "../../utils/updateGeoData";
import { normalizeGeoData } from "../../utils/geoDataNormalizer";
import { YandexGeoRenderer } from "./YandexGeoRenderer";
import { fromYandexCoords } from "./utils/coordinateConverter";

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
        script.onload = () => window.ymaps?.ready(resolve);
        script.onerror = () => reject(new Error("Failed to load Yandex Maps"));

        document.head.appendChild(script);
    });

    return yandexMapsPromise;
};

interface YandexEngineProps {
    providerId: string;
    drawActionType?: DrawActionType;
    markerIconUrl?: string;
    tempGeoData: GeoData;
    savedGeoData: GeoData;
    onUpdateGeoData: (data: GeoData) => void;
}

const DEFAULT_CENTER: [number, number] = [55.7558, 37.6173];
const DEFAULT_ZOOM = 10;

export const YandexEngine: FC<YandexEngineProps> = ({
    providerId,
    drawActionType,
    markerIconUrl,
    tempGeoData,
    savedGeoData,
    onUpdateGeoData,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<Map<string, any>>(new Map());
    const drawActionRef = useRef(drawActionType);
    const styleTagRef = useRef<HTMLStyleElement | null>(null);
    const containerIdRef = useRef<string | null>(null);

    useEffect(() => {
        drawActionRef.current = drawActionType;
    }, [drawActionType]);

    const handleClick = useCallback(
        (e: any) => {
            const coords: [number, number] = fromYandexCoords(e.get("coords"));
            const action = drawActionRef.current;
            if (!action) return;
            onUpdateGeoData(updateGeoData(normalizeGeoData(tempGeoData), coords, action));
        },
        [tempGeoData, onUpdateGeoData]
    );

    useEffect(() => {
        const apiKey = (import.meta.env as any).VITE_YANDEX_API_KEY;
        if (!apiKey || !containerRef.current) return;

        if (!containerIdRef.current) {
            containerIdRef.current = "yandex-map-" + Date.now() + "-" + Math.random().toString(36).slice(2);
            containerRef.current.id = containerIdRef.current;
        }

        let isUnmounted = false;

        const initMap = async () => {
            try {
                await loadYandexMaps(apiKey);
                if (isUnmounted || !containerRef.current) return;

                const mapType =
                    providerId === "YandexSatellite"
                        ? "yandex#satellite"
                        : providerId === "YandexHybrid"
                            ? "yandex#hybrid"
                            : "yandex#map";

                const map = mapRef.current || new window.ymaps.Map(containerRef.current, {
                    center: DEFAULT_CENTER,
                    zoom: DEFAULT_ZOOM,
                    type: mapType,
                    controls: [],
                });

                mapRef.current = map;
                map.setType(mapType);

                const clickHandler = (e: any) => handleClick(e);
                map.events.add("click", clickHandler);

                return () => map.events.remove("click", clickHandler);
            } catch (e) {
                console.error("Yandex Maps init error:", e);
            }
        };

        const cleanupPromise = initMap();

        return () => {
            isUnmounted = true;
            cleanupPromise?.then((cleanup) => cleanup && cleanup());
        };
    }, [providerId, handleClick]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !containerIdRef.current) return;
        if (!styleTagRef.current) {
            const styleTag = document.createElement("style");
            document.head.appendChild(styleTag);
            styleTagRef.current = styleTag;
        }
        styleTagRef.current.innerHTML = `
            #${containerIdRef.current} .ymaps-2-1-79-map,
            #${containerIdRef.current} .ymaps-2-1-79-map * {
                cursor: ${drawActionRef.current ? "crosshair" : "grab"} !important;
            }
        `;
    }, [drawActionType]);

    return (
        <>
            <div ref={containerRef} className={styles.mapContainer} />
            {mapRef.current && (
                <YandexGeoRenderer
                    map={mapRef.current}
                    tempGeoData={tempGeoData}
                    savedGeoData={savedGeoData}
                    markerIconUrl={markerIconUrl}
                    markersRef={markersRef}
                />
            )}
        </>
    );
};

export default YandexEngine;
