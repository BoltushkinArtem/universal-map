/**
 * Преобразует координаты из формата [долгота, широта] в формат Yandex [широта, долгота].
 * @param coords - Координаты в формате [долгота, широта]
 * @returns Координаты в формате [широта, долгота]
 */
export const toYandexCoords = ([lng, lat]: [number, number]): [number, number] => [lat, lng];

/**
 * Преобразует координаты из формата Yandex [широта, долгота] в стандартный формат [долгота, широта].
 * @param coords - Координаты в формате [широта, долгота]
 * @returns Координаты в формате [долгота, широта]
 */
export const fromYandexCoords = ([lat, lng]: [number, number]): [number, number] => [lng, lat];
