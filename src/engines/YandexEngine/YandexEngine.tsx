import React, { FC, useCallback, useEffect, useRef } from "react";
import styles from "./YandexEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData } from "../geoDataType";
import { updateGeoData } from "../../utils/updateGeoData";
import { normalizeGeoData } from "../../utils/geoDataNormalizer";

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

        script.onload = () => {
            if (window.ymaps?.ready) window.ymaps.ready(resolve);
            else reject(new Error("Yandex Maps failed to load"));
        };
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

const YandexEngine: FC<YandexEngineProps> = ({
    providerId,
    drawActionType,
    markerIconUrl,
    tempGeoData,
    savedGeoData,
    onUpdateGeoData,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const objectsRef = useRef<Record<string, any>>({});
    const drawActionRef = useRef(drawActionType);
    const styleTagRef = useRef<HTMLStyleElement | null>(null);
    const containerIdRef = useRef<string | null>(null);

    // --- обновляем ref для drawActionType ---
    useEffect(() => {
        drawActionRef.current = drawActionType;
    }, [drawActionType]);

    // --- обработчик клика ---
    const handleClick = useCallback(
        (e: any) => {
            const coords: [number, number] = e.get("coords");
            const action = drawActionRef.current;
            if (!action) return;

            onUpdateGeoData(updateGeoData(normalizeGeoData(tempGeoData), coords, action));
        },
        [tempGeoData, onUpdateGeoData]
    );

    // --- инициализация карты ---
    useEffect(() => {
        const apiKey = (import.meta.env as any).VITE_YANDEX_API_KEY;
        if (!apiKey || !containerRef.current) return;

        if (!containerIdRef.current) {
            containerIdRef.current =
                "yandex-map-" +
                Date.now() +
                "-" +
                Math.random().toString(36).slice(2);
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
                        center: DEFAULT_CENTER,
                        zoom: DEFAULT_ZOOM,
                        type: mapType,
                        controls: [],
                    });

                mapRef.current = map;
                map.setType(mapType);

                // --- подписка на клик ---
                const clickHandler = (e: any) => handleClick(e);
                map.events.add("click", clickHandler);

                // --- очистка подписки при unmount ---
                return () => {
                    map.events.remove("click", clickHandler);
                };
            } catch (e) {
                console.error("Yandex Maps initialization error:", e);
            }
        };

        const cleanupPromise = initializeMap();

        return () => {
            isUnmounted = true;
            cleanupPromise?.then((cleanup) => cleanup && cleanup());
        };
    }, [providerId, markerIconUrl, handleClick]);

    // --- рендер объектов без мерцания ---
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !tempGeoData) return;

        const store = objectsRef.current;
        const existingFeatureIds = new Set(Object.keys(store));

        const normalizedSaved = normalizeGeoData(savedGeoData);
        const normalizedTemp = normalizeGeoData(tempGeoData);

        const allPoints = [...normalizedSaved.features, ...normalizedTemp.features];

        allPoints.forEach((feature) => {
            const id = feature.properties.id;

            if (store[id]) {
                existingFeatureIds.delete(id);
                if (feature.geometry.type === "LineString") {
                    const item = store[id];
                    item.main.geometry.setCoordinates(feature.geometry.coordinates);
                    const coords = feature.geometry.coordinates;
                    if (item.squares.length < coords.length) {
                        for (let i = item.squares.length; i < coords.length; i++) {
                            const sq = new window.ymaps.Placemark([0, 0], {}, {
                                iconLayout: "default#image",
                                iconImageHref:
                                    "data:image/svg+xml;charset=UTF-8," +
                                    encodeURIComponent(`
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
                                            <rect width="10" height="10" fill="white" stroke="black" stroke-width="1"/>
                                        </svg>
                                    `),
                                iconImageSize: [10, 10],
                                iconImageOffset: [-5, -5],
                                draggable: false,
                            });
                            map.geoObjects.add(sq);
                            item.squares.push(sq);
                        }
                    }
                    coords.forEach((coord, i) => {
                        item.squares[i].geometry.setCoordinates(coord);
                    });
                }
                return;
            }

            if (feature.geometry.type === "Point") {
                const obj = new window.ymaps.Placemark(feature.geometry.coordinates, {}, {
                    iconLayout: "default#image",
                    iconImageHref:
                        markerIconUrl || "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                    iconImageSize: [32, 32],
                    draggable: true,
                });
                store[id] = obj;
                map.geoObjects.add(obj);
                existingFeatureIds.delete(id);
                return;
            }

            if (feature.geometry.type === "LineString") {
                const poly = new window.ymaps.Polyline(feature.geometry.coordinates, {}, {
                    strokeColor: "#FF0000",
                    strokeWidth: 3,
                    strokeOpacity: 1,
                });
                const squares = feature.geometry.coordinates.map((coord) => {
                    return new window.ymaps.Placemark(coord, {}, {
                        iconLayout: "default#image",
                        iconImageHref:
                            "data:image/svg+xml;charset=UTF-8," +
                            encodeURIComponent(`
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
                                    <rect width="10" height="10" fill="white" stroke="black" stroke-width="1"/>
                                </svg>
                            `),
                        iconImageSize: [10, 10],
                        iconImageOffset: [-5, -5],
                        draggable: false,
                    });
                });
                store[id] = { main: poly, squares };
                map.geoObjects.add(poly);
                squares.forEach((sq) => map.geoObjects.add(sq));
                existingFeatureIds.delete(id);
            }
        });

        existingFeatureIds.forEach((id) => {
            const item = store[id];
            if (!item) return;
            if (item.main && item.squares) {
                map.geoObjects.remove(item.main);
                item.squares.forEach((s: any) => map.geoObjects.remove(s));
            } else {
                map.geoObjects.remove(item);
            }
            delete store[id];
        });
    }, [tempGeoData, savedGeoData, markerIconUrl]);

    // --- курсор ---
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !containerIdRef.current) return;

        if (!styleTagRef.current) {
            const styleTag = document.createElement("style");
            document.head.appendChild(styleTag);
            styleTagRef.current = styleTag;
        }

        const cursorStyle =
            drawActionRef.current === DrawActionType.POLYLINE ? "crosshair" : "grab";

        styleTagRef.current.innerHTML = `
            #${containerIdRef.current} .ymaps-2-1-79-map,
            #${containerIdRef.current} .ymaps-2-1-79-map * {
                cursor: ${cursorStyle} !important;
            }
        `;
    }, [drawActionType]);

    return <div ref={containerRef} className={styles.mapContainer} />;
};

export default YandexEngine;
