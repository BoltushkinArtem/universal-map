import { FC, useEffect, useRef, useCallback, useState } from "react";
import maplibregl, { GeoJSONSource, Map as MapLibreMap, MapMouseEvent, LngLatLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { tileTemplate } from "../../utils/providers";
import styles from "./MapLibreEngine.module.scss";
import { DrawActionType } from "../drawActionType";

interface MapLibreEngineProps {
    providerId: string;
    drawActionType?: DrawActionType;
    markerIconUrl?: string;
    tempGeoData: GeoJSON.FeatureCollection;
    savedGeoData?: GeoJSON.FeatureCollection;
    onUpdateGeoData: (data: GeoJSON.FeatureCollection) => void;
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

    const isLineFeature = (f: GeoJSON.Feature): f is GeoJSON.Feature<GeoJSON.LineString> =>
        f.geometry.type === "LineString";
    const isPointFeature = (f: GeoJSON.Feature): f is GeoJSON.Feature<GeoJSON.Point> =>
        f.geometry.type === "Point";

    const handleMapClick = useCallback(
        (event: MapMouseEvent) => {
            const action = drawActionRef.current;
            if (!action) return;

            const coords: [number, number] = [event.lngLat.lng, event.lngLat.lat];

            const cloned: GeoJSON.FeatureCollection =
                typeof structuredClone === "function"
                    ? structuredClone(tempGeoData)
                    : JSON.parse(JSON.stringify(tempGeoData || { type: "FeatureCollection", features: [] }));

            cloned.features = Array.isArray(cloned.features) ? cloned.features : [];

            if (action === DrawActionType.MARKER) {
                cloned.features.push({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: coords },
                    properties: { id: nextIdRef.current++, type: "marker" },
                });
                onUpdateGeoData(cloned);
                return;
            }

            if (action === DrawActionType.POLYLINE) {
                const tempLine = cloned.features
                    .slice()
                    .reverse()
                    .find(
                        (f): f is GeoJSON.Feature<GeoJSON.LineString> =>
                            isLineFeature(f) && f.properties?.isTemp
                    );

                if (tempLine) {
                    (tempLine.geometry as GeoJSON.LineString).coordinates.push(coords);
                } else {
                    cloned.features.push({
                        type: "Feature",
                        geometry: { type: "LineString", coordinates: [coords] },
                        properties: { id: nextIdRef.current++, type: "polyline", isTemp: true },
                    });
                }

                onUpdateGeoData(cloned);
                return;
            }
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

        const allFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [
            ...(savedGeoData?.features ?? []),
            ...(tempGeoData.features ?? []),
        ].filter(isPointFeature);

        const newIds = new Set<string>();

        allFeatures.forEach((feature) => {
            const id = feature.properties?.id?.toString();
            if (!id) return;

            newIds.add(id);
            const existingMarker = markersRef.current.get(id);

            const coordinates = feature.geometry.coordinates as [number, number];

            if (existingMarker) {
                const curr = existingMarker.getLngLat();
                if (curr.lng !== coordinates[0] || curr.lat !== coordinates[1]) {
                    existingMarker.setLngLat(coordinates as LngLatLike);
                }
            } else {
                const el = document.createElement("div");
                el.className = "custom-marker";
                el.style.width = "32px";
                el.style.height = "32px";
                el.style.backgroundImage = `url(${markerIconUrl ?? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"})`;
                el.style.backgroundSize = "contain";
                el.style.backgroundRepeat = "no-repeat";

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat(coordinates as LngLatLike)
                    .addTo(map);

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

        const allFeatures: GeoJSON.Feature[] = [
            ...(savedGeoData?.features ?? []),
            ...(tempGeoData.features ?? []),
        ];

        const lineFeatures = allFeatures.filter(isLineFeature) as GeoJSON.Feature<GeoJSON.LineString>[];
        const lineSourceId = "geo-lines";
        const lineCollection: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
            type: "FeatureCollection",
            features: lineFeatures,
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

        const vertexFeatures: GeoJSON.Feature<GeoJSON.Point>[] = lineFeatures.flatMap((lf) =>
            (lf.geometry as GeoJSON.LineString).coordinates.map((coord, idx) => ({
                type: "Feature",
                geometry: { type: "Point", coordinates: coord },
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
