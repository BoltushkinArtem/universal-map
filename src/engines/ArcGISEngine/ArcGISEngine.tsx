import React, { FC, useEffect, useRef, useState, useCallback } from "react";
import styles from "./ArcGISEngine.module.scss";
import { DrawActionType } from "../drawActionType";

interface ArcGISEngineProps {
    providerId: string;
    drawActionType?: DrawActionType;
    markerIconUrl?: string;
}

const DEFAULT_CENTER: [number, number] = [37.6173, 55.7558];
const DEFAULT_ZOOM = 10;

const ArcGISEngine: FC<ArcGISEngineProps> = ({
    providerId,
    drawActionType,
    markerIconUrl,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<__esri.MapView | null>(null);
    const graphicsLayerRef = useRef<__esri.GraphicsLayer | null>(null);
    const polylineGraphicRef = useRef<__esri.Graphic | null>(null);
    const clickHandlerRef = useRef<__esri.WatchHandle | null>(null);

    const drawActionRef = useRef<DrawActionType | undefined>(drawActionType);
    const polylineCoordsRef = useRef<number[][]>([]);

    // Все маркеры и линии хранятся в одной GeoJSON FeatureCollection
    const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection>({
        type: "FeatureCollection",
        features: [],
    });

    // Обновляем текущий режим рисования
    useEffect(() => {
        drawActionRef.current = drawActionType;
        if (containerRef.current) {
            containerRef.current.style.cursor = drawActionType ? "crosshair" : "grab";
        }
    }, [drawActionType]);

    // Инициализация ArcGIS API и карты
    useEffect(() => {
        let cancelled = false;

        const loadArcGisApi = async (): Promise<void> => {
            if ((window as any).require) return;

            const cssLink = document.createElement("link");
            cssLink.rel = "stylesheet";
            cssLink.href = "https://js.arcgis.com/4.26/esri/themes/light/main.css";
            document.head.appendChild(cssLink);

            await new Promise<void>((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "https://js.arcgis.com/4.26/";
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error("ArcGIS API failed to load"));
                document.head.appendChild(script);
            });
        };

        const initializeMap = async (): Promise<void> => {
            await loadArcGisApi();
            if (cancelled || !containerRef.current) return;

            (window as any).require(
                [
                    "esri/Map",
                    "esri/views/MapView",
                    "esri/Graphic",
                    "esri/layers/GraphicsLayer",
                    "esri/geometry/Point",
                    "esri/geometry/Polyline",
                    "esri/symbols/SimpleLineSymbol",
                    "esri/symbols/PictureMarkerSymbol",
                ],
                (
                    Map: typeof __esri.Map,
                    MapView: typeof __esri.MapView,
                    Graphic: typeof __esri.Graphic,
                    GraphicsLayer: typeof __esri.GraphicsLayer,
                    Point: typeof __esri.Point,
                    Polyline: typeof __esri.Polyline,
                    SimpleLineSymbol: typeof __esri.SimpleLineSymbol,
                    PictureMarkerSymbol: typeof __esri.PictureMarkerSymbol
                ) => {
                    if (cancelled) return;

                    // Создаем карту
                    const map = new Map({
                        basemap: providerId === "MapLibre_ArcGISAero" ? "satellite" : "streets-vector",
                    });

                    // Создаем view
                    const view = new MapView({
                        container: containerRef.current!,
                        map,
                        center: DEFAULT_CENTER,
                        zoom: DEFAULT_ZOOM,
                    });
                    viewRef.current = view;

                    // Добавляем слой для графики
                    const graphicsLayer = new GraphicsLayer();
                    map.add(graphicsLayer);
                    graphicsLayerRef.current = graphicsLayer;

                    // Обработчик кликов карты, который только обновляет geoData
                    clickHandlerRef.current = view.on("click", (event: __esri.ViewClickEvent) => {
                        const { longitude, latitude } = event.mapPoint;

                        if (drawActionRef.current === DrawActionType.MARKER) {
                            const marker = new Graphic({
                                geometry: new Point({ longitude, latitude }),
                                symbol: new PictureMarkerSymbol({
                                    url: markerIconUrl || "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                                    width: 32,
                                    height: 32,
                                }),
                            });
                            graphicsLayer.add(marker);
                        }

                        if (drawActionRef.current === DrawActionType.POLYLINE) {
                            polylineCoordsRef.current.push([longitude, latitude]);

                            if (polylineCoordsRef.current.length >= 2) {
                                const polyline = new Polyline({ paths: [polylineCoordsRef.current] });
                                const lineSymbol = new SimpleLineSymbol({ color: [255, 0, 0], width: 3 });

                                if (!polylineGraphicRef.current) {
                                    polylineGraphicRef.current = new Graphic({ geometry: polyline, symbol: lineSymbol });
                                    graphicsLayer.add(polylineGraphicRef.current);
                                } else {
                                    polylineGraphicRef.current.geometry = polyline;
                                }
                            }

                            const squareGraphic = new Graphic({
                                geometry: new Point({ longitude, latitude }),
                                symbol: {
                                    type: "simple-marker",
                                    style: "square",
                                    size: 10,
                                    color: [255, 255, 255],
                                    outline: { color: [0, 0, 0], width: 1 },
                                } as any,
                            });
                            graphicsLayer.add(squareGraphic);
                        }
                    });

                }
            );
        };

        initializeMap().catch(console.error);

        return () => {
            cancelled = true;
            clickHandlerRef.current?.remove();
            clickHandlerRef.current = null;
            viewRef.current?.destroy();
            viewRef.current = null;
            graphicsLayerRef.current = null;
            polylineGraphicRef.current = null;
        };
    }, [providerId]);

    // Эффект для отрисовки всех объектов карты на основе geoData
    useEffect(() => {
        const view = viewRef.current;
        const graphicsLayer = graphicsLayerRef.current;
        if (!view || !graphicsLayer) return;

        // Очищаем слой перед перерисовкой
        graphicsLayer.removeAll();
        polylineGraphicRef.current = null;

        geoData.features.forEach((feature) => {
            if (feature.geometry.type === "Point") {
                const marker = new (window as any).__esri.Graphic({
                    geometry: new (window as any).__esri.Point({
                        longitude: feature.geometry.coordinates[0],
                        latitude: feature.geometry.coordinates[1],
                    }),
                    symbol: new (window as any).__esri.PictureMarkerSymbol({
                        url: markerIconUrl || "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                        width: 32,
                        height: 32,
                    }),
                });
                graphicsLayer.add(marker);
            }

            if (feature.geometry.type === "LineString") {
                const polyline = new (window as any).__esri.Polyline({
                    paths: [feature.geometry.coordinates],
                });

                const lineSymbol = new (window as any).__esri.SimpleLineSymbol({
                    color: [255, 0, 0],
                    width: 3,
                });

                const polylineGraphic = new (window as any).__esri.Graphic({
                    geometry: polyline,
                    symbol: lineSymbol,
                });
                graphicsLayer.add(polylineGraphic);
                polylineGraphicRef.current = polylineGraphic;

                // Белые квадратики для контрольных точек
                (feature.geometry.coordinates as [number, number][]).forEach((coord) => {
                    const [lng, lat] = coord;
                    const square = new (window as any).__esri.Graphic({
                        geometry: new (window as any).__esri.Point({ longitude: lng, latitude: lat }),
                        symbol: {
                            type: "simple-marker",
                            style: "square",
                            size: 10,
                            color: [255, 255, 255],
                            outline: { color: [0, 0, 0], width: 1 },
                        } as any,
                    });
                    graphicsLayer.add(square);
                });
            }
        });
    }, [geoData, markerIconUrl]);

    return <div ref={containerRef} className={styles.arcgisContainer} />;
};

export default ArcGISEngine;
