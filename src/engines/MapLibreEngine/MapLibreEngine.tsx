import { FC, useEffect, useRef, useCallback, useState } from "react";
import maplibregl, { GeoJSONSource, Map as MapLibreMap, MapMouseEvent, LngLatLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { tileTemplate } from "../../utils/providers";
import styles from "./MapLibreEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData, GeoFeature } from "../geoDataType";
import { normalizeGeoData } from "../../utils/geoDataNormalizer";
import { updateGeoData } from "../../utils/updateGeoData";

interface MapLibreEngineProps {
    providerId: string;
    drawActionType?: DrawActionType;
    markerIconUrl?: string;
    tempGeoData: GeoData;
    savedGeoData?: GeoData;
    onUpdateGeoData: (data: GeoData) => void;
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
    tempGeoData,
    savedGeoData,
    onUpdateGeoData,
}) => {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const drawActionRef = useRef(drawActionType);
    const nextIdRef = useRef(1);
    const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

    const [mapReady, setMapReady] = useState(false);

    useEffect(() => {
        if (!mapContainerRef.current || !isWebGLAvailable()) return;

        setMapReady(false);

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: "https://demotiles.maplibre.org/style.json",
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
        });

        mapRef.current = map;

        const onLoad = () => {
            const tiles = tileTemplate(providerId);
            if (tiles?.length && !map.getSource("basemap")) {
                map.addSource("basemap", { type: "raster", tiles, tileSize: 256 });
                map.addLayer({ id: "basemap", type: "raster", source: "basemap" });
            }

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
        };

        map.on("load", onLoad);
        const onIdle = () => setMapReady(true);
        map.on("idle", onIdle);

        return () => {
            map.off("load", onLoad);
            map.off("idle", onIdle);
            map.remove();
            mapRef.current = null;
        };
    }, [providerId]);

    useEffect(() => {
        drawActionRef.current = drawActionType;
        if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = drawActionType ? "crosshair" : "";
        }
    }, [drawActionType]);

    const isLineFeature = (f: GeoFeature): f is GeoFeature & { geometry: { type: "LineString"; coordinates: [number, number][] } } =>
        f.geometry.type === "LineString";

    const isPointFeature = (f: GeoFeature): f is GeoFeature & { geometry: { type: "Point"; coordinates: [number, number] } } =>
        f.geometry.type === "Point";

    const handleMapClick = useCallback(
        (event: MapMouseEvent) => {
            const action = drawActionRef.current;
            if (!action) return;

            const coords: [number, number] = [event.lngLat.lng, event.lngLat.lat];

            const updated = updateGeoData(normalizeGeoData(tempGeoData), coords, action);
            onUpdateGeoData(updated);
        },
        [tempGeoData, onUpdateGeoData]
    );

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        map.on("click", handleMapClick);
        return () => { map.off("click", handleMapClick); }
    }, [handleMapClick]);

    const renderMarkers = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;

        const normalizedSaved = normalizeGeoData(savedGeoData);
        const normalizedTemp = normalizeGeoData(tempGeoData);

        const allPoints = [...normalizedSaved.features, ...normalizedTemp.features].filter(isPointFeature);

        const newIds = new Set<string>();

        allPoints.forEach((feature) => {
            const id = feature.properties?.id?.toString();
            if (!id) return;

            newIds.add(id);

            let marker = markersRef.current.get(id);
            const [lng, lat] = feature.geometry.coordinates;

            if (marker) {
                const curr = marker.getLngLat();
                if (curr.lng !== lng || curr.lat !== lat) {
                    marker.setLngLat([lng, lat] as LngLatLike);
                }
            } else {
                const el = document.createElement("div");
                el.className = "custom-marker";
                el.style.width = "32px";
                el.style.height = "32px";
                el.style.backgroundImage = `url(${markerIconUrl ?? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"})`;
                el.style.backgroundSize = "contain";
                el.style.backgroundRepeat = "no-repeat";

                marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat] as LngLatLike).addTo(map);
                markersRef.current.set(id, marker);
            }
        });

        markersRef.current.forEach((marker, id) => {
            if (!newIds.has(id)) {
                marker.remove();
                markersRef.current.delete(id);
            }
        });
    }, [markerIconUrl, savedGeoData, tempGeoData]);

    const renderGeoData = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;

        const normalizedSaved = normalizeGeoData(savedGeoData);
        const normalizedTemp = normalizeGeoData(tempGeoData);
        const allFeatures = [...normalizedSaved.features, ...normalizedTemp.features];

        const lineFeatures = allFeatures.filter(isLineFeature);

        // линии
        const lineSourceId = "geo-lines";
        const lineCollection: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
            type: "FeatureCollection",
            features: lineFeatures.map(f => ({
                type: "Feature",
                geometry: { type: "LineString", coordinates: f.geometry.coordinates as [number, number][] },
                properties: f.properties ?? {},
            })),
        };
        if (map.getSource(lineSourceId)) {
            (map.getSource(lineSourceId) as GeoJSONSource).setData(lineCollection);
        } else if (lineFeatures.length > 0) {
            map.addSource(lineSourceId, { type: "geojson", data: lineCollection });
            map.addLayer({
                id: lineSourceId,
                type: "line",
                source: lineSourceId,
                paint: { "line-color": "#ff0000", "line-width": 3 },
            });
        }

        // вершины линий
        const vertexFeatures: GeoJSON.Feature<GeoJSON.Point>[] = lineFeatures.flatMap(lf =>
            lf.geometry.coordinates.map((coord, idx) => ({
                type: "Feature",
                geometry: { type: "Point", coordinates: coord as [number, number] },
                properties: { id: `${lf.properties?.id ?? "ln"}-${idx}` },
            }))
        );

        const vertexSourceId = "geo-vertices";
        const vertexCollection: GeoJSON.FeatureCollection<GeoJSON.Point> = {
            type: "FeatureCollection",
            features: vertexFeatures,
        };
        if (map.getSource(vertexSourceId)) {
            (map.getSource(vertexSourceId) as GeoJSONSource).setData(vertexCollection);
        } else if (vertexFeatures.length > 0) {
            map.addSource(vertexSourceId, { type: "geojson", data: vertexCollection });
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

        renderMarkers();
    }, [savedGeoData, tempGeoData, renderMarkers]);

    useEffect(() => {
        if (!mapReady) return;
        renderGeoData();
    }, [mapReady, renderGeoData]);

    return <div ref={mapContainerRef} className={styles.mapInner} />;
};

export default MapLibreEngine;