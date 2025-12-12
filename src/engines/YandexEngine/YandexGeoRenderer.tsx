import { useEffect, useCallback } from "react";
import { GeoData, GeoFeature } from "../geoDataType";
import { toYandexCoords } from "./utils/coordinateConverter";

interface YandexGeoRendererProps {
    /** Экземпляр карты Yandex */
    map: any;
    /** Временные геоданные, создаваемые пользователем */
    tempGeoData: GeoData;
    /** Сохраненные геоданные */
    savedGeoData?: GeoData;
    /** URL иконки для маркеров */
    markerIconUrl?: string;
    /** Ref для хранения созданных маркеров и полилиний */
    markersRef: React.MutableRefObject<Map<string, any>>;
}

/**
 * Компонент рендерит геоданные на карте Yandex:
 * - точки как маркеры
 * - линии как полигоны с вершинными маркерами
 */
export const YandexGeoRenderer = ({
    map,
    tempGeoData,
    savedGeoData,
    markerIconUrl,
    markersRef,
}: YandexGeoRendererProps) => {

    /**
     * Типовая проверка линии
     */
    const isLineFeature = (f: GeoFeature): f is GeoFeature & { geometry: { type: "LineString"; coordinates: [number, number][] } } =>
        f.geometry.type === "LineString";

    /**
     * Типовая проверка точки
     */
    const isPointFeature = (f: GeoFeature): f is GeoFeature & { geometry: { type: "Point"; coordinates: [number, number] } } =>
        f.geometry.type === "Point";

    /**
     * Рендеринг точечных маркеров на карте
     */
    const renderMarkers = useCallback(() => {
        if (!map) return;

        const allPoints = [...(savedGeoData?.features ?? []), ...tempGeoData.features].filter(isPointFeature);
        const newIds = new Set<string>();

        allPoints.forEach((feature) => {
            const id = feature.properties?.id?.toString();
            if (!id) return;
            newIds.add(id);

            let marker = markersRef.current.get(id);
            const coords = toYandexCoords(feature.geometry.coordinates);

            if (marker) {
                marker.geometry.setCoordinates(coords);
            } else {
                marker = new window.ymaps.Placemark(coords, {}, {
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

    /**
     * Рендеринг линий и вершин на карте
     */
    const renderLines = useCallback(() => {
        if (!map) return;

        const allLines = [...(savedGeoData?.features ?? []), ...tempGeoData.features].filter(isLineFeature);

        allLines.forEach((feature) => {
            const id = feature.properties?.id?.toString();
            if (!id) return;

            let item = markersRef.current.get(id);
            const coords = feature.geometry.coordinates.map(toYandexCoords);

            if (item) {
                item.main.geometry.setCoordinates(coords);
                item.squares.forEach((sq: any, idx: number) => sq.geometry.setCoordinates(coords[idx]));
            } else {
                const poly = new window.ymaps.Polyline(coords, {}, {
                    strokeColor: "#FF0000",
                    strokeWidth: 3,
                    strokeOpacity: 1,
                });

                const squares = coords.map((coord) => new window.ymaps.Placemark(coord, {}, {
                    iconLayout: "default#image",
                    iconImageHref: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
                          <rect width="10" height="10" fill="white" stroke="black" stroke-width="1"/>
                        </svg>
                    `)}`,
                    iconImageSize: [10, 10],
                    iconImageOffset: [-5, -5],
                    draggable: false,
                }));

                map.geoObjects.add(poly);
                squares.forEach((sq) => map.geoObjects.add(sq));
                markersRef.current.set(id, { main: poly, squares });
            }
        });
    }, [map, savedGeoData, tempGeoData, markersRef]);

    /**
     * Рендеринг всех геоданных: линии и точки
     */
    const renderGeoData = useCallback(() => {
        renderLines();
        renderMarkers();
    }, [renderLines, renderMarkers]);

    /**
     * Эффект, вызывающий рендер при изменении карты или геоданных
     */
    useEffect(() => {
        if (!map) return;
        renderGeoData();
    }, [map, renderGeoData]);

    return null;
};
