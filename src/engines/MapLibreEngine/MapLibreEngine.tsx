import { FC, useEffect, useRef, useState, useCallback } from "react";
import maplibregl, { Map, GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { tileTemplate } from "../../utils/providers";
import styles from "./MapLibreEngine.module.scss";
import { DrawActionType } from "../drawActionType";

interface MapLibreEngineProps {
    providerId: string;
    drawActionType?: DrawActionType;
    markerIconUrl?: string;
}

interface Marker {
    id: number;
    lngLat: [number, number];
}

interface Polyline {
    id: number;
    coordinates: [number, number][];
}

/**
 * Проверяет поддержку WebGL в браузере.
 */
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

/**
 * Основной компонент карты MapLibre.
 * Позволяет рисовать маркеры и линии на карте.
 */
const MapLibreEngine: FC<MapLibreEngineProps> = ({
    providerId,
    drawActionType,
    markerIconUrl,
}) => {
    // --- Refs -------------------------------------------------------

    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<Map | null>(null);
    const drawActionRef = useRef(drawActionType);
    const currentPolylineRef = useRef<[number, number][]>([]);
    const markerIdRef = useRef(0);
    const polylineIdRef = useRef(0);

    // --- State ------------------------------------------------------

    const [markers, setMarkers] = useState<Marker[]>([]);
    const [polylines, setPolylines] = useState<Polyline[]>([]);

    // --- Effects ----------------------------------------------------

    // Обновляем актуальное значение режима рисования
    useEffect(() => {
        drawActionRef.current = drawActionType;
    }, [drawActionType]);

    // Инициализация карты
    useEffect(() => {
        if (!mapContainerRef.current || !isWebGLAvailable()) return;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: "https://demotiles.maplibre.org/style.json",
            center: [37.6173, 55.7558],
            zoom: 10,
        });

        mapRef.current = map;

        map.on("load", () => {
            const tiles = tileTemplate(providerId);
            if (tiles?.length && !map.getSource("basemap")) {
                map.addSource("basemap", { type: "raster", tiles, tileSize: 256 });
                map.addLayer({ id: "basemap", type: "raster", source: "basemap" });
            }
        });

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [providerId]);

    // Изменяем курсор при смене режима рисования
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        map.getCanvas().style.cursor = drawActionType ? "crosshair" : "";
    }, [drawActionType]);

    // Обработка кликов по карте — добавление маркеров и линий
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const handleClick = (event: MapMouseEvent) => {
            if (!event.lngLat) return;
            const lngLat: [number, number] = [event.lngLat.lng, event.lngLat.lat];

            switch (drawActionRef.current) {
                case DrawActionType.MARKER: {
                    const newMarker: Marker = { id: ++markerIdRef.current, lngLat };
                    setMarkers((prev) => [...prev, newMarker]);
                    break;
                }

                case DrawActionType.POLYLINE: {
                    currentPolylineRef.current.push(lngLat);

                    const currentId = polylineIdRef.current || 1;
                    setPolylines((prev) => {
                        const existing = prev.find((p) => p.id === currentId);
                        const updated = { id: currentId, coordinates: [...currentPolylineRef.current] };

                        if (existing) {
                            return prev.map((p) => (p.id === currentId ? updated : p));
                        }

                        polylineIdRef.current = currentId;
                        return [...prev, updated];
                    });

                    break;
                }

                default:
                    break;
            }
        };

        map.on("click", handleClick);
        return () => {
            map.off("click", handleClick);
        };
    }, []);

    // Отрисовка маркеров и линий на карте
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        // --- Очистка при пустых массивах -----------------------------------
        if (markers.length === 0) {
            document.querySelectorAll(".custom-marker").forEach((el) => el.remove());
        }
        if (polylines.length === 0) {
            document.querySelectorAll(".polyline-point").forEach((el) => el.remove());
            map.getStyle().layers
                ?.filter((layer) => layer.id.startsWith("polyline-"))
                .forEach((layer) => {
                    if (map.getLayer(layer.id)) map.removeLayer(layer.id);
                    if (map.getSource(layer.id)) map.removeSource(layer.id);
                });
        }

        // --- Маркеры ---------------------------------------------------

        markers.forEach((marker) => {
            const markerEl = document.createElement("div");
            markerEl.className = "custom-marker";
            markerEl.style.width = "32px";
            markerEl.style.height = "32px";
            markerEl.style.backgroundImage = `url(${markerIconUrl || "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
                })`;
            markerEl.style.backgroundSize = "contain";
            markerEl.style.backgroundRepeat = "no-repeat";

            new maplibregl.Marker({ element: markerEl, draggable: true })
                .setLngLat(marker.lngLat)
                .addTo(map);
        });

        // --- Полилинии ------------------------------------------------

        polylines.forEach((line) => {
            const sourceId = `polyline-${line.id}`;
            const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
                type: "Feature",
                geometry: { type: "LineString", coordinates: line.coordinates },
                properties: {},
            };

            const source = map.getSource(sourceId) as GeoJSONSource | undefined;

            if (source) {
                source.setData(geojson);
            } else {
                map.addSource(sourceId, { type: "geojson", data: geojson });
                map.addLayer({
                    id: sourceId,
                    type: "line",
                    source: sourceId,
                    paint: { "line-color": "#ff0000", "line-width": 3 },
                });
            }

            // --- Контрольные точки (белые квадраты) ---------------------

            line.coordinates.forEach((coord, idx) => {
                const pointId = `${sourceId}-point-${idx}`;
                if (document.querySelector(`[data-point-id="${pointId}"]`)) return;

                const pointEl = document.createElement("div");
                pointEl.className = "polyline-point";
                pointEl.dataset.pointId = pointId;
                Object.assign(pointEl.style, {
                    width: "10px",
                    height: "10px",
                    backgroundColor: "white",
                    border: "1px solid black",
                    borderRadius: "2px",
                    boxSizing: "border-box",
                });

                new maplibregl.Marker({ element: pointEl, draggable: false })
                    .setLngLat(coord)
                    .addTo(map);
            });
        });
    }, [markers, polylines, markerIconUrl]);

    // --- Actions ----------------------------------------------------

    const handleRemoveLastMarker = useCallback(() => {
        setMarkers((prev) => prev.slice(0, -1));
    }, []);

    // --- Render -----------------------------------------------------

    return (
        <div className={styles.mapContainer}>
            <div ref={mapContainerRef} className={styles.mapInner} />
            <button
                type="button"
                onClick={handleRemoveLastMarker}
                className={styles.removeMarkerButton}
            >
                Remove Last Marker
            </button>
        </div>
    );
};

export default MapLibreEngine;
