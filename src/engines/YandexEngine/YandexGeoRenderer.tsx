import { useEffect, useCallback } from "react";
import { GeoData, GeoFeature } from "../geoDataType";

interface YandexGeoRendererProps {
    map: any; // window.ymaps.Map
    tempGeoData: GeoData;
    savedGeoData?: GeoData;
    markerIconUrl?: string;
    markersRef: React.MutableRefObject<Map<string, any>>;
}

export const YandexGeoRenderer = ({
    map,
    tempGeoData,
    savedGeoData,
    markerIconUrl,
    markersRef,
}: YandexGeoRendererProps) => {

    const isLineFeature = (f: GeoFeature): f is GeoFeature & { geometry: { type: "LineString"; coordinates: [number, number][] } } =>
        f.geometry.type === "LineString";

    const isPointFeature = (f: GeoFeature): f is GeoFeature & { geometry: { type: "Point"; coordinates: [number, number] } } =>
        f.geometry.type === "Point";

    const renderMarkers = useCallback(() => {
        if (!map) return;

        const normalizedSaved = savedGeoData ?? { type: "FeatureCollection", features: [] };
        const normalizedTemp = tempGeoData;

        const allPoints = [...normalizedSaved.features, ...normalizedTemp.features].filter(isPointFeature);
        const newIds = new Set<string>();

        allPoints.forEach((feature) => {
            const id = feature.properties?.id?.toString();
            if (!id) return;
            newIds.add(id);

            let marker = markersRef.current.get(id);

            const [lat, lng] = feature.geometry.coordinates; // Yandex: [lat, lng]

            if (marker) {
                marker.geometry.setCoordinates([lat, lng]);
            } else {
                marker = new window.ymaps.Placemark([lat, lng], {}, {
                    iconLayout: "default#image",
                    iconImageHref: markerIconUrl ?? "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                    iconImageSize: [32, 32],
                    draggable: true,
                });
                map.geoObjects.add(marker);
                markersRef.current.set(id, marker);
            }
        });

        markersRef.current.forEach((marker, id) => {
            if (!newIds.has(id)) {
                map.geoObjects.remove(marker);
                markersRef.current.delete(id);
            }
        });

    }, [map, markerIconUrl, savedGeoData, tempGeoData, markersRef]);

    const renderGeoData = useCallback(() => {
        if (!map) return;

        const normalizedSaved = savedGeoData ?? { type: "FeatureCollection", features: [] };
        const normalizedTemp = tempGeoData;
        const allFeatures = [...normalizedSaved.features, ...normalizedTemp.features];

        // Линии
        allFeatures.filter(isLineFeature).forEach((feature) => {
            const id = feature.properties?.id?.toString();
            if (!id) return;

            let item = markersRef.current.get(id);

            if (item) {
                item.main.geometry.setCoordinates(feature.geometry.coordinates);
                feature.geometry.coordinates.forEach((coord, idx) => {
                    item.squares[idx].geometry.setCoordinates(coord);
                });
            } else {
                const poly = new window.ymaps.Polyline(feature.geometry.coordinates, {}, {
                    strokeColor: "#FF0000",
                    strokeWidth: 3,
                    strokeOpacity: 1,
                });

                const squares = feature.geometry.coordinates.map((coord) => {
                    return new window.ymaps.Placemark(coord, {}, {
                        iconLayout: "default#image",
                        iconImageHref: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
                <rect width="10" height="10" fill="white" stroke="black" stroke-width="1"/>
              </svg>
            `)}`,
                        iconImageSize: [10, 10],
                        iconImageOffset: [-5, -5],
                        draggable: false,
                    });
                });

                map.geoObjects.add(poly);
                squares.forEach((sq) => map.geoObjects.add(sq));
                markersRef.current.set(id, { main: poly, squares });
            }
        });

        renderMarkers();

    }, [map, renderMarkers, savedGeoData, tempGeoData, markersRef]);

    useEffect(() => {
        if (!map) return;
        renderGeoData();
    }, [map, renderGeoData]);

    return null;
};
