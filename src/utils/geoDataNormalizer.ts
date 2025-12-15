import { GeoData, GeoFeature } from "../engines/geoDataType";

/**
 * Преобразует переданный FeatureCollection GeoJSON в внутренний формат GeoData проекта.
 *
 * - Фильтрует все некорректные или неподдерживаемые геометрии.
 * - Присваивает уникальный идентификатор каждой фиче (если отсутствует).
 * - Определяет тип фичи: "marker" для Point и "polyline" для LineString.
 * - Устанавливает флаг isTemp для каждой фичи.
 *
 * @param data - Исходный FeatureCollection GeoJSON, который необходимо нормализовать.
 * @returns {GeoData} Нормализованный объект GeoData с массивом валидных фич.
 */
export const normalizeGeoData = (data?: GeoJSON.FeatureCollection<any>): GeoData => {
    // Если данных нет, возвращаем пустую коллекцию
    if (!data) {
        return { type: "FeatureCollection", features: [] };
    }

    // Преобразуем каждую фичу в валидный формат GeoFeature проекта
    const normalizedFeatures: GeoFeature[] = data.features
        .map((feature): GeoFeature | null => {
            // Игнорируем фичи без геометрии
            if (!feature.geometry) return null;

            // Поддерживаются только точки и линии
            const geometryType = feature.geometry.type;
            if (geometryType !== "Point" && geometryType !== "LineString") return null;

            // Формируем объект GeoFeature с корректными свойствами
            const geoFeature: GeoFeature = {
                type: "Feature",
                geometry: feature.geometry as GeoJSON.Point | GeoJSON.LineString,
                properties: {
                    // Если id отсутствует, генерируем уникальный
                    id: feature.properties?.id ?? crypto.randomUUID(),
                    // Определяем тип: Point -> marker, LineString -> polyline
                    type: geometryType === "Point" ? "marker" : "polyline",
                    // Флаг временной фичи
                    isTemp: feature.properties?.isTemp ?? false,
                },
            };

            return geoFeature;
        })
        // Фильтруем null значения
        .filter((f): f is GeoFeature => f !== null);

    // Возвращаем нормализованную коллекцию
    return {
        type: "FeatureCollection",
        features: normalizedFeatures,
    };
};

/**
 * Преобразует массив объектов сервера в формат GeoData проекта.
 *
 * Поддерживаются только типы геометрий:
 * - Point -> marker
 * - LineString -> polyline
 *
 * Polygon игнорируется на данный момент.
 *
 * @param serverData - Массив объектов от сервера с полями Id, Title и LocationDisposition
 * @returns {GeoData} Объект GeoData, готовый к использованию в проекте
 */
export const normalizeServerDataToGeoData = (serverData: any[]): GeoData => {
    // Преобразуем каждый объект сервера в GeoFeature проекта
    const features: GeoFeature[] = serverData
        .map((item) => {
            const geomType = item.LocationDisposition?.type;

            // Поддерживаются только Point и LineString
            if (geomType === "Point" || geomType === "LineString") {
                return {
                    type: "Feature",
                    geometry: item.LocationDisposition as GeoJSON.Point | GeoJSON.LineString,
                    properties: {
                        id: String(item.Id), // Присваиваем id как строку
                        type: geomType === "Point" ? "marker" : "polyline",
                        isTemp: false, // Данные с сервера всегда считаются сохраненными
                    },
                } as GeoFeature;
            }

            // Игнорируем неподдерживаемые геометрии
            return null;
        })
        // Фильтруем null значения
        .filter((f): f is GeoFeature => f !== null);

    return {
        type: "FeatureCollection",
        features,
    };
};

/**
 * Преобразует GeoFeature проекта в объект LocationDisposition,
 * соответствующий формату сервера.
 *
 * Пример результата:
 * {
 *   type: "Point",
 *   coordinates: [21.462238, 43.89167]
 * }
 *
 * Поддерживаются типы:
 * - Point
 * - LineString
 * - Polygon
 *
 * @param feature - GeoFeature для конвертации
 * @returns { type: string; coordinates: any } Объект LocationDisposition
 */
export const geoFeatureToLocationDisposition = (feature: GeoFeature): { type: string; coordinates: any } => {
    return {
        type: feature.geometry.type,
        coordinates: feature.geometry.coordinates,
    };
};
