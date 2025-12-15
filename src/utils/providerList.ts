import { MapConfig } from "../engines/mapConfig";

/**
 * Тип объекта провайдера карты.
 * 
 * - `id` — уникальный идентификатор провайдера, используется для поиска и логики отображения.
 * - `title` — человекочитаемое название карты, отображается в UI.
 * - `config` — базовая конфигурация карты (центр и масштаб) для инициализации.
 * - `tiles` — массив URL шаблонов тайлов для провайдеров MapLibre. Необязательное поле для SDK-карт (Google, Yandex).
 * - `src` — URL скрипта API/SDK для провайдеров типа Google/Yandex. Необязательное поле для MapLibre.
 */
export interface MapProvider {
    id: string;
    title: string;
    config: MapConfig;
    tiles?: string[];
    src?: string;
}

/**
 * Список доступных провайдеров карт.
 * 
 * Используется для:
 * - Инициализации карт разных провайдеров
 * - Генерации списка выбора карт в UI
 * - Получения конфигурации и URL тайлов для MapLibre
 * - Получения src для SDK-карт (Google, Yandex)
 */
export const PROVIDERS: MapProvider[] = [
    {
        id: "MapLibre_OSM",
        title: "OpenStreetMap (MapLibre)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
        tiles: [
            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ],
    },
    {
        id: "MapLibre_Mapbox",
        title: "Mapbox (via MapLibre)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
        tiles: [
            `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}?access_token=${import.meta.env.VITE_MAPBOX_TOKEN ?? ""}`,
        ],
    },
    {
        id: "MapLibre_ArcGISAero",
        title: "ArcGIS Aero (MapLibre)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
        tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
    },
    {
        id: "MapLibre_ArcGIS",
        title: "ArcGIS Streets (MapLibre)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
        tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        ],
    },
    {
        id: "MapLibre_OpenTransport",
        title: "OpenTransport (Thunderforest) (MapLibre)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
        tiles: [
            `https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${import.meta.env.VITE_OPENTRANSPORT_KEY ?? ""}`,
        ],
    },
    {
        id: "Google",
        title: "Карта Google (SDK)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
        src: `https://maps.googleapis.com/maps/api/js?key=${(import.meta.env as any).VITE_GOOGLE_API_KEY}&v=weekly&libraries=geometry,places`,
    },
    {
        id: "GoogleSatellite",
        title: "Спутник Google (SDK)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
        src: `https://maps.googleapis.com/maps/api/js?key=${(import.meta.env as any).VITE_GOOGLE_API_KEY}&v=weekly&libraries=geometry,places`,
    },
    {
        id: "Yandex",
        title: "Карта Яндекс (SDK)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
        src: `https://api-maps.yandex.ru/2.1/?apikey=${(import.meta.env as any).VITE_YANDEX_API_KEY}&lang=ru_RU`,
    },
    {
        id: "YandexSatellite",
        title: "Спутник Яндекс (SDK)",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
        src: `https://api-maps.yandex.ru/2.1/?apikey=${(import.meta.env as any).VITE_YANDEX_API_KEY}&lang=ru_RU`,
    },
    {
        id: "YandexHybrid",
        title: "Яндекс: гибрид",
        config: { center: { lng: 37.6173, lat: 55.7558 }, zoom: 10 },
        src: `https://api-maps.yandex.ru/2.1/?apikey=${(import.meta.env as any).VITE_YANDEX_API_KEY}&lang=ru_RU`,
    },
];
