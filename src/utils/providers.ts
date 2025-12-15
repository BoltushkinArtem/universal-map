import { MapConfig } from "../engines/mapConfig";

/**
 * Кеш конфигураций провайдеров карт.
 * Используется для избежания повторного поиска и клонирования.
 */
const providerConfigCache = new Map<string, MapConfig>();

/**
 * Список доступных провайдеров карт с их уникальными ID, читаемыми названиями и конфигурациями.
 */
export const PROVIDERS: Array<{ id: string; title: string; config: MapConfig }> = [
    {
        id: "MapLibre_OSM",
        title: "OpenStreetMap (MapLibre)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
    },
    {
        id: "MapLibre_Mapbox",
        title: "Mapbox (via MapLibre)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
    },
    {
        id: "MapLibre_ArcGISAero",
        title: "ArcGIS Aero (MapLibre)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
    },
    {
        id: "MapLibre_ArcGIS",
        title: "ArcGIS Streets (MapLibre)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
    },
    {
        id: "MapLibre_OpenTransport",
        title: "OpenTransport (Thunderforest) (MapLibre)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
    },
    {
        id: "Google",
        title: "Карта Google (SDK)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
    },
    {
        id: "GoogleSatellite",
        title: "Спутник Google (SDK)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
    },
    {
        id: "Yandex",
        title: "Карта Яндекс (SDK)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
    },
    {
        id: "YandexSatellite",
        title: "Спутник Яндекс (SDK)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
    },
    {
        id: "YandexHybrid",
        title: "Яндекс: гибрид",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
    },
];

/**
 * Возвращает массив URL шаблонов тайлов для провайдеров MapLibre.
 *
 * @param providerId - уникальный идентификатор провайдера
 * @returns Массив строк с URL шаблонами тайлов, либо пустой массив для неподдерживаемых провайдеров
 */
export const tileTemplate = (providerId: string): string[] => {
    const env = import.meta.env as Record<string, string | undefined>;
    const mapboxToken = env.VITE_MAPBOX_TOKEN ?? "";
    const thunderKey = env.VITE_OPENTRANSPORT_KEY ?? "";

    switch (providerId) {
        case "MapLibre_OSM":
            return [
                "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ];

        case "MapLibre_Mapbox":
            return [
                `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}?access_token=${mapboxToken}`,
            ];

        case "MapLibre_ArcGISAero":
            return [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ];

        case "MapLibre_ArcGIS":
            return [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
            ];

        case "MapLibre_OpenTransport":
            return [
                `https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${thunderKey}`,
            ];

        default:
            return [];
    }
};

/**
 * Возвращает конфигурацию карты для выбранного провайдера.
 * Использует кеш для ускорения повторных запросов.
 *
 * @param providerId - уникальный идентификатор провайдера
 * @throws Ошибка, если конфигурация для провайдера не найдена
 * @returns MapConfig — копия конфигурации провайдера
 */
export const getProviderConfig = (providerId: string): MapConfig => {
    // Проверка кеша
    if (providerConfigCache.has(providerId)) {
        return structuredClone(providerConfigCache.get(providerId)!);
    }

    // Поиск конфигурации в PROVIDERS
    const config = PROVIDERS.find((p) => p.id === providerId)?.config;

    if (!config) {
        throw new Error(`Provider config not found: ${providerId}`);
    }

    // Сохраняем в кеш для последующего использования
    providerConfigCache.set(providerId, config);

    // Возвращаем структурную копию, чтобы избежать мутаций внешним кодом
    return structuredClone(config);
};
