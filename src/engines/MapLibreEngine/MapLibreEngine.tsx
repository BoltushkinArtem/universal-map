import { FC, useEffect, useRef, useCallback } from "react";
import maplibregl, { Map, GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { tileTemplate } from "../../utils/providers";
import styles from "./MapLibreEngine.module.scss";
import { DrawActionType } from "../drawActionType";

interface MapLibreEngineProps {
    providerId: string;
    drawActionType?: DrawActionType;
    markerIconUrl?: string;
    tempPolylinePoints: [number, number][];
    savedPolylines?: [number, number][][];
    onUpdatePoints: (points: [number, number][]) => void;
}

const DEFAULT_CENTER: [number, number] = [37.6173, 55.7558];
const DEFAULT_ZOOM = 10;

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
    drawActionType,
    markerIconUrl,
    tempPolylinePoints,
    savedPolylines = [],
    onUpdatePoints,
}) => {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<Map | null>(null);
    const nextIdRef = useRef(1);
    const geoDataRef = useRef<GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>>({
        type: "FeatureCollection",
        features: [],
    });
    const drawActionRef = useRef(drawActionType);

    // Инициализация карты
    useEffect(() => {
        if (!mapContainerRef.current || !isWebGLAvailable()) return;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: "https://demotiles.maplibre.org/style.json",
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
        });

        mapRef.current = map;

        map.on("load", () => {
            // Добавляем пользовательский тайл-провайдер
            const tiles = tileTemplate(providerId);
            if (tiles?.length && !map.getSource("basemap")) {
                map.addSource("basemap", { type: "raster", tiles, tileSize: 256 });
                map.addLayer({ id: "basemap", type: "raster", source: "basemap" });
            }

            // Добавляем белый квадрат для вершин
            if (!map.hasImage("white-square")) {
                const size = 8;
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, size, size);
                    const imageData = ctx.getImageData(0, 0, size, size);
                    map.addImage("white-square", imageData);
                }
            }

            // После загрузки стиля рендерим линии и вершины
            renderPolylinesAndVertices();
            renderMarkers();
        });

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [providerId]);

    // Обновляем текущее действие рисования и курсор
    useEffect(() => {
        drawActionRef.current = drawActionType;
        if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = drawActionType ? "crosshair" : "";
        }
    }, [drawActionType]);

    // Обработка кликов по карте
    const handleMapClick = useCallback(
        (event: MapMouseEvent) => {
            const coords: [number, number] = [event.lngLat.lng, event.lngLat.lat];
            const currentDraw = drawActionRef.current;
            if (!currentDraw) return;

            if (currentDraw === DrawActionType.MARKER) {
                const markerFeature: GeoJSON.Feature<GeoJSON.Point> = {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: coords },
                    properties: { id: nextIdRef.current++, type: "marker" },
                };
                geoDataRef.current.features.push(markerFeature);
                renderMarkers();
            }

            if (currentDraw === DrawActionType.POLYLINE) {
                onUpdatePoints([...tempPolylinePoints, coords]);
            }
        },
        [tempPolylinePoints, onUpdatePoints]
    );

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        map.on("click", handleMapClick);
        return () => {
            map.off("click", handleMapClick);
        };
    }, [handleMapClick]);

    // Рендер маркеров
    const renderMarkers = () => {
        const map = mapRef.current;
        if (!map) return;

        document.querySelectorAll(".custom-marker").forEach((el) => el.remove());

        geoDataRef.current.features.forEach((feature) => {
            if (feature.geometry.type !== "Point") return;

            const markerEl = document.createElement("div");
            markerEl.className = "custom-marker";
            markerEl.style.width = "32px";
            markerEl.style.height = "32px";
            markerEl.style.backgroundImage = `url(${markerIconUrl || "https://maps.google.com/mapfiles/ms/icons/red-dot.png"})`;
            markerEl.style.backgroundSize = "contain";
            markerEl.style.backgroundRepeat = "no-repeat";

            new maplibregl.Marker({ element: markerEl, draggable: true })
                .setLngLat(feature.geometry.coordinates as [number, number])
                .addTo(map);
        });
    };

    // Рендер полилиний и вершин
    const renderPolylinesAndVertices = useCallback(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        const allPolylines = [...savedPolylines, tempPolylinePoints].filter((p) => p.length > 0);

        // Линии
        const lineSourceId = "active-polyline-line";
        const lineData: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
            type: "FeatureCollection",
            features: allPolylines.map((coords) => ({
                type: "Feature",
                geometry: { type: "LineString", coordinates: coords },
                properties: {},
            })),
        };

        if (map.getSource(lineSourceId)) {
            (map.getSource(lineSourceId) as GeoJSONSource).setData(lineData);
        } else if (allPolylines.length > 0) {
            map.addSource(lineSourceId, { type: "geojson", data: lineData });
            map.addLayer({
                id: lineSourceId,
                type: "line",
                source: lineSourceId,
                paint: { "line-color": "#ff0000", "line-width": 3 },
            });
        }

        // Вершины
        const vertexSourceId = "active-polyline-vertices";
        const vertexFeatures: GeoJSON.Feature<GeoJSON.Point>[] = allPolylines.flatMap((poly) =>
            poly.map((coords, idx) => ({
                type: "Feature",
                geometry: { type: "Point", coordinates: coords },
                properties: { id: idx },
            }))
        );

        const vertexData: GeoJSON.FeatureCollection<GeoJSON.Point> = {
            type: "FeatureCollection",
            features: vertexFeatures,
        };

        if (map.getSource(vertexSourceId)) {
            (map.getSource(vertexSourceId) as GeoJSONSource).setData(vertexData);
        } else if (vertexFeatures.length > 0) {
            map.addSource(vertexSourceId, { type: "geojson", data: vertexData });
            map.addLayer({
                id: vertexSourceId,
                type: "symbol",
                source: vertexSourceId,
                layout: {
                    "icon-image": "white-square",
                    "icon-size": 1,
                    "icon-allow-overlap": true,
                    "icon-anchor": "center",
                },
            });
        }
    }, [tempPolylinePoints, savedPolylines]);

    // Автоматический рендер линий и вершин при изменении данных
    useEffect(() => {
        renderPolylinesAndVertices();
    }, [tempPolylinePoints, savedPolylines, renderPolylinesAndVertices]);

    return <div ref={mapContainerRef} className={styles.mapInner} />;
};

export default MapLibreEngine;
