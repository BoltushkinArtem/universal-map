import React, { FC, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { tileTemplate } from "../../utils/providers";
import styles from "./MapLibreEngine.module.scss";

interface MapLibreEngineProps {
    providerId: string;
    drawMarkerOn: boolean;
    drawPolylineOn?: boolean;
    markerIconUrl?: string;
}

interface MarkerData {
    id: number;
    lngLat: [number, number];
}

interface PolylineData {
    id: number;
    coordinates: [number, number][];
}

// Проверяем, поддерживает ли браузер WebGL
const isWebGLAvailable = (): boolean => {
    try {
        const canvas = document.createElement("canvas");
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
        );
    } catch {
        return false;
    }
};

const MapLibreEngine: FC<MapLibreEngineProps> = ({
    providerId,
    drawMarkerOn,
    drawPolylineOn = false,
    markerIconUrl,
}) => {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);
    const [markerData, setMarkerData] = useState<MarkerData[]>([]);
    const [polylineData, setPolylineData] = useState<PolylineData[]>([]);
    const markerIdRef = useRef(0);
    const polylineIdRef = useRef(0);
    const currentPolylineRef = useRef<[number, number][]>([]);

    // Инициализация карты
    useEffect(() => {
        if (!mapContainerRef.current || !isWebGLAvailable()) return;

        const mapInstance = new maplibregl.Map({
            container: mapContainerRef.current,
            style: "https://demotiles.maplibre.org/style.json",
            center: [37.6173, 55.7558],
            zoom: 10,
        });

        mapRef.current = mapInstance;

        mapInstance.on("load", () => {
            const tiles = tileTemplate(providerId);
            if (!tiles?.length) return;

            if (!mapInstance.getSource("basemap")) {
                mapInstance.addSource("basemap", { type: "raster", tiles, tileSize: 256 });
                mapInstance.addLayer({ id: "basemap", type: "raster", source: "basemap" });
            }
        });

        // Функция очистки эффекта
        return () => {
            markersRef.current.forEach((marker) => marker.remove());
            markersRef.current = [];
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [providerId]);

    // Обновление тайлов при смене провайдера
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        const source = map.getSource("basemap") as maplibregl.RasterTileSource | undefined;
        if (!source) return;

        (source as any).tiles = tileTemplate(providerId);
        map.triggerRepaint();
    }, [providerId]);

    // Внутри useEffect для drawPolylineOn
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const canvas = map.getCanvas();

        if (drawPolylineOn) {
            canvas.style.cursor = "crosshair"; // ставим крестик на canvas
        } else {
            canvas.style.cursor = "";       // сброс на стандартный
        }
    }, [drawPolylineOn]);

    // Обработка кликов для добавления маркеров и полилиний
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const handleClick = (e: maplibregl.MapMouseEvent) => {
            const lngLatTuple: [number, number] = [e.lngLat.lng, e.lngLat.lat];

            // Добавление маркера
            if (drawMarkerOn) {
                const markerEl = document.createElement("div");
                markerEl.style.width = "32px";
                markerEl.style.height = "32px";
                markerEl.style.backgroundImage = `url(${markerIconUrl || "https://maps.google.com/mapfiles/ms/icons/red-dot.png"})`;
                markerEl.style.backgroundSize = "contain";
                markerEl.style.backgroundRepeat = "no-repeat";

                const marker = new maplibregl.Marker({ element: markerEl, draggable: true })
                    .setLngLat(lngLatTuple)
                    .addTo(map);

                markersRef.current.push(marker);
                setMarkerData((prev) => [...prev, { id: ++markerIdRef.current, lngLat: lngLatTuple }]);
            }

            // --- drawPolylineOn: маленький белый квадратик ---
            if (drawPolylineOn) {
                const markerEl = document.createElement("div");
                markerEl.style.width = "10px";
                markerEl.style.height = "10px";
                markerEl.style.backgroundColor = "white";
                markerEl.style.border = "1px solid black";
                markerEl.style.boxSizing = "border-box";

                const marker = new maplibregl.Marker({ element: markerEl, draggable: false })
                    .setLngLat(lngLatTuple)
                    .addTo(map);

                markersRef.current.push(marker);
                setMarkerData((prev) => [...prev, { id: ++markerIdRef.current, lngLat: lngLatTuple }]);

                // --- Добавляем точку в полилинию ---
                currentPolylineRef.current.push(lngLatTuple);
                const polylineId = polylineIdRef.current;

                if (currentPolylineRef.current.length >= 2) {
                    const sourceId = `polyline-${polylineId}`;
                    const layerId = `polyline-${polylineId}`;
                    const existingSource = map.getSource(sourceId) as maplibregl.GeoJSONSource;

                    const geojson: GeoJSON.Feature<GeoJSON.LineString, {}> = {
                        type: "Feature",
                        geometry: { type: "LineString", coordinates: currentPolylineRef.current },
                        properties: {},
                    };

                    if (existingSource) {
                        existingSource.setData(geojson);
                    } else {
                        map.addSource(sourceId, { type: "geojson", data: geojson });
                        map.addLayer({
                            id: layerId,
                            type: "line",
                            source: sourceId,
                            paint: { "line-color": "#ff0000", "line-width": 3 },
                        });
                        setPolylineData((prev) => [
                            ...prev,
                            { id: polylineIdRef.current, coordinates: [...currentPolylineRef.current] },
                        ]);
                    }
                }
            }
        };

        map.on("click", handleClick);
        return () => {
            map.off("click", handleClick);
        };
    }, [drawMarkerOn, drawPolylineOn, markerIconUrl]);

    // Удаление последнего маркера
    const removeLastMarker = (): void => {
        const lastMarker = markersRef.current.pop();
        lastMarker?.remove();
        setMarkerData((prev) => prev.slice(0, -1));
    };

    return (
        <div className={styles.mapContainer}>
            <div ref={mapContainerRef} className={styles.mapInner} />
            <button onClick={removeLastMarker} className={styles.removeMarkerButton}>
                Remove Last Marker
            </button>
        </div>
    );
};

export default MapLibreEngine;
