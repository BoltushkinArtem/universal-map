// Список доступных провайдеров карт
export const PROVIDERS: { id: string; title: string }[] = [
  { id: "MapLibre_OSM", title: "OpenStreetMap (MapLibre)" },
  { id: "MapLibre_Mapbox", title: "Mapbox (via MapLibre)" },
  { id: "MapLibre_ArcGISAero", title: "ArcGIS Aero (MapLibre)" },
  { id: "MapLibre_ArcGIS", title: "ArcGIS Streets (MapLibre)" },
  { id: "MapLibre_OpenTransport", title: "OpenTransport (Thunderforest) (MapLibre)" },
  { id: "Google", title: "Карта Google (SDK)" },
  { id: "GoogleSatellite", title: "Спутник Google (SDK)" },
  { id: "Yandex", title: "Карта Яндекс (SDK)" },
  { id: "YandexSatellite", title: "Спутник Яндекс (SDK)" },
  { id: "YandexHybrid", title: "Яндекс: гибрид" },
];

/**
 * Возвращает массив URL шаблонов тайлов для выбранного провайдера.
 * @param providerId - идентификатор провайдера карт
 */
export const tileTemplate = (providerId: string): string[] => {
  // Получаем переменные окружения с токенами для Mapbox и Thunderforest
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
      // Для всех остальных провайдеров пока нет шаблонов тайлов
      return [];
  }
};
