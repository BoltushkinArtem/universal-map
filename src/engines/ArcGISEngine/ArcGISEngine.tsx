import React, { FC, useEffect, useRef } from "react";
import styles from "./ArcGISEngine.module.scss";

interface ArcGISEngineProps {
    providerId: string;
    drawMarkerOn?: boolean;
    drawPolylineOn?: boolean;
    markerIconUrl?: string;
}

const ArcGISEngine: FC<ArcGISEngineProps> = ({
    providerId,
    drawMarkerOn = false,
    drawPolylineOn = false,
    markerIconUrl,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<__esri.MapView | null>(null);
    const graphicsLayerRef = useRef<__esri.GraphicsLayer | null>(null);
    const polylineGraphicRef = useRef<__esri.Graphic | null>(null);
    const clickHandlerRef = useRef<__esri.WatchHandle | null>(null);
    const polylineCoordsRef = useRef<number[][]>([]);

    const drawMarkerRef = useRef(drawMarkerOn);
    const drawPolylineRef = useRef(drawPolylineOn);

    // Синхронизация текущих значений флагов
    useEffect(() => {
        drawMarkerRef.current = drawMarkerOn;
    }, [drawMarkerOn]);

    useEffect(() => {
        drawPolylineRef.current = drawPolylineOn;
    }, [drawPolylineOn]);

    // Инициализация карты и слоев
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

                    // Создаём карту с выбранным провайдером
                    const map = new Map({
                        basemap: providerId === "MapLibre_ArcGISAero" ? "satellite" : "streets-vector",
                    });

                    // Инициализация MapView
                    const view = new MapView({
                        container: containerRef.current!,
                        map,
                        center: [37.6173, 55.7558],
                        zoom: 10,
                    });
                    viewRef.current = view;

                    // Слой для маркеров и линий
                    const graphicsLayer = new GraphicsLayer();
                    map.add(graphicsLayer);
                    graphicsLayerRef.current = graphicsLayer;

                    // Установка начального курсора
                    if (containerRef.current) {
                        containerRef.current.style.cursor =
                            drawMarkerRef.current || drawPolylineRef.current ? "crosshair" : "grab";
                    }

                    // Обработчик кликов по карте
                    clickHandlerRef.current = view.on("click", (event: __esri.ViewClickEvent) => {
                        const { longitude, latitude } = event.mapPoint;

                        // Добавление маркера
                        if (drawMarkerRef.current) {
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

                        // Добавление полилинии
                        if (drawPolylineRef.current) {
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

                            // Маленький квадрат на точке линии
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
    }, [providerId, markerIconUrl]);

    // Динамическое обновление курсора при изменении флагов
    useEffect(() => {
        if (!containerRef.current) return;
        containerRef.current.style.cursor = drawMarkerOn || drawPolylineOn ? "crosshair" : "grab";
    }, [drawMarkerOn, drawPolylineOn]);

    return <div ref={containerRef} className={styles.arcgisContainer} />;
};

export default ArcGISEngine;
