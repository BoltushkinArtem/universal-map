import { FC, useEffect, useRef, useCallback } from "react";
import maplibregl, { GeoJSONSource, Map, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { tileTemplate } from "../../utils/providers";
import styles from "./MapLibreEngine.module.scss";
import { DrawActionType } from "../drawActionType";

/**
 * Map component props — работа через GeoJSON FeatureCollection:
 * - tempGeoData: временные геоданные (рисование)
 * - savedGeoData: сохранённые геоданные (завершённые объекты)
 * - onUpdateGeoData: callback для обновления временных данных (и для маркеров тоже)
 */
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

// Быстрая проверка поддержки WebGL (если нет — не инициализируем карту)
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
    // Контейнер для карты
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    // Экземпляр карты
    const mapRef = useRef<Map | null>(null);
    // Текущий режим рисования (реф чтобы обработчики получали актуальное значение)
    const drawActionRef = useRef(drawActionType);
    // Простая генерация id для свойств фич (локально)
    const nextIdRef = useRef(1);

    // Инициализация карты (однократно при смене providerId)
    useEffect(() => {
        if (!mapContainerRef.current || !isWebGLAvailable()) return;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: "https://demotiles.maplibre.org/style.json",
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
        });

        mapRef.current = map;

        // Подготовка стиля и вспомогательных ресурсов после загрузки стиля
        const onLoad = () => {
            // Добавляем опциональный тайл-провайдер
            const tiles = tileTemplate(providerId);
            if (tiles?.length && !map.getSource("basemap")) {
                map.addSource("basemap", { type: "raster", tiles, tileSize: 256 });
                map.addLayer({ id: "basemap", type: "raster", source: "basemap" });
            }

            // Создаём и добавляем синхронно маленький белый квадрат для иконки вершин
            if (!map.hasImage("white-square")) {
                const size = 8;
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, size, size);
                    // ImageData совместим с map.addImage в MapLibre
                    const imageData = ctx.getImageData(0, 0, size, size);
                    map.addImage("white-square", imageData);
                }
            }

            // Первый рендер на случай, если данные уже переданы до загрузки карты
            renderGeoData();
        };

        map.on("load", onLoad);

        // Очистка при анмаунте
        return () => {
            map.off("load", onLoad);
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [providerId]); // пересоздать карту при смене провайдера

    // Синхронизируем реф режима рисования и курсор карты
    useEffect(() => {
        drawActionRef.current = drawActionType;
        if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = drawActionType ? "crosshair" : "";
        }
    }, [drawActionType]);

    // Тип-гуарды для упрощения
    const isLineFeature = (f: GeoJSON.Feature): f is GeoJSON.Feature<GeoJSON.LineString> =>
        f.geometry.type === "LineString";

    const isPointFeature = (f: GeoJSON.Feature): f is GeoJSON.Feature<GeoJSON.Point> =>
        f.geometry.type === "Point";

    // Обработчик клика по карте — добавляет фичи в tempGeoData через onUpdateGeoData
    const handleMapClick = useCallback(
        (event: MapMouseEvent) => {
            const action = drawActionRef.current;
            if (!action) return;

            const coords: [number, number] = [event.lngLat.lng, event.lngLat.lat];

            // Клонируем tempGeoData чтобы не мутировать пропсы напрямую
            // Используем structuredClone если доступно, иначе JSON-подход
            const cloned: GeoJSON.FeatureCollection =
                typeof structuredClone === "function"
                    ? structuredClone(tempGeoData)
                    : JSON.parse(JSON.stringify(tempGeoData || { type: "FeatureCollection", features: [] }));

            // Убедимся, что у нас есть массив features
            cloned.features = Array.isArray(cloned.features) ? cloned.features : [];

            // Маркер — добавляем Feature<Point>
            if (action === DrawActionType.MARKER) {
                const pointFeature: GeoJSON.Feature<GeoJSON.Point> = {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: coords },
                    properties: { id: nextIdRef.current++, type: "marker" },
                };
                cloned.features.push(pointFeature);
                onUpdateGeoData(cloned);
                return;
            }

            // Полилиния — находим активную временную полилинию (isTemp true) или создаём новую
            if (action === DrawActionType.POLYLINE) {
                // найти последнюю временную LineString
                const tempLine = cloned.features
                    .slice()
                    .reverse()
                    .find((f): f is GeoJSON.Feature<GeoJSON.LineString> => isLineFeature(f) && f.properties?.isTemp);

                if (tempLine) {
                    // добавляем координату в существующую временную линию
                    tempLine.geometry.coordinates.push(coords);
                } else {
                    // создаём новую временную линию с одной координатой
                    const newLine: GeoJSON.Feature<GeoJSON.LineString> = {
                        type: "Feature",
                        geometry: { type: "LineString", coordinates: [coords] },
                        properties: { id: nextIdRef.current++, type: "polyline", isTemp: true },
                    };
                    cloned.features.push(newLine);
                }

                onUpdateGeoData(cloned);
                return;
            }
        },
        [tempGeoData, onUpdateGeoData]
    );

    // Подписка на клики карты (и отписка)
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        map.on("click", handleMapClick);
        return () => {
            map.off("click", handleMapClick);
        };
    }, [handleMapClick]);

    // Рендер DOM-маркеров (custom DOM elements) — удаляем старые и создаём новые
    const renderMarkers = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;

        // Удаляем DOM-маркеры, чтобы избежать дубликатов
        document.querySelectorAll(".custom-marker").forEach((el) => el.remove());

        // Собираем все point-фичи из saved + temp
        const allFeatures: GeoJSON.Feature[] = [
            ...(savedGeoData?.features ?? []),
            ...(tempGeoData.features ?? []),
        ];

        allFeatures
            .filter(isPointFeature)
            .forEach((feature) => {
                const el = document.createElement("div");
                el.className = "custom-marker";
                el.style.width = "32px";
                el.style.height = "32px";
                el.style.backgroundImage = `url(${markerIconUrl ?? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"})`;
                el.style.backgroundSize = "contain";
                el.style.backgroundRepeat = "no-repeat";

                // Добавляем DOM-маркер в карту
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                new (maplibregl as any).Marker({ element: el }).setLngLat(feature.geometry.coordinates as [number, number]).addTo(map);
            });
    }, [markerIconUrl, savedGeoData, tempGeoData]);

    // Основной рендер линий и вершин на карте через GeoJSON source / layers.
    const renderGeoData = useCallback(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        // Собираем все линии из saved + temp
        const allFeatures: GeoJSON.Feature[] = [
            ...(savedGeoData?.features ?? []),
            ...(tempGeoData.features ?? []),
        ];

        // Отфильтруем только LineString features
        const lineFeatures = allFeatures.filter(isLineFeature) as GeoJSON.Feature<GeoJSON.LineString>[];

        // Создаём GeoJSON FeatureCollection для линий
        const lineSourceId = "geo-lines";
        const lineCollection: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
            type: "FeatureCollection",
            features: lineFeatures,
        };

        // Устанавливаем/обновляем source + layer для линий
        if (map.getSource(lineSourceId)) {
            const src = map.getSource(lineSourceId) as GeoJSONSource;
            src.setData(lineCollection);
        } else if (lineFeatures.length > 0) {
            map.addSource(lineSourceId, { type: "geojson", data: lineCollection });
            map.addLayer({
                id: lineSourceId,
                type: "line",
                source: lineSourceId,
                paint: { "line-color": "#ff0000", "line-width": 3 },
            });
        }

        // Формируем вершины (Point features) для всех координат линий
        const vertexFeatures: GeoJSON.Feature<GeoJSON.Point>[] = lineFeatures.flatMap((lf) =>
            lf.geometry.coordinates.map((coord, idx) => {
                const feat: GeoJSON.Feature<GeoJSON.Point> = {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: coord as [number, number] },
                    properties: { id: `${lf.properties?.id ?? "ln"}-${idx}` },
                };
                return feat;
            })
        );

        const vertexSourceId = "geo-vertices";
        const vertexCollection: GeoJSON.FeatureCollection<GeoJSON.Point> = {
            type: "FeatureCollection",
            features: vertexFeatures,
        };

        // Устанавливаем/обновляем source + layer для вершин
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

        // Отрисовать DOM-маркеры тоже
        renderMarkers();
    }, [savedGeoData, tempGeoData, renderMarkers]);

    // При изменениях данных перерисовываем графику на карте
    useEffect(() => {
        renderGeoData();
    }, [renderGeoData]);

    // Финальный JSX — контейнер карты
    return <div ref={mapContainerRef} className={styles.mapInner} />;
};

export default MapLibreEngine;
