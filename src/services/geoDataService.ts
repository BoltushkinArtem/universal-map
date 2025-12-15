import { GeoData } from "../engines/geoDataType";
import { normalizeServerDataToGeoData } from "../utils/geoDataNormalizer";

/**
 * Время имитации задержки ответа сервера в миллисекундах.
 * Используется для симуляции реального сетевого запроса.
 */
const SERVER_DELAY_MS = 1500;

/**
 * Тип данных, имитирующих серверный ответ.
 * Каждая запись содержит идентификатор, заголовок и географическую позицию (точка или линия).
 */
interface ServerGeoAsset {
    Id: number;
    Title: string;
    LocationDisposition: {
        type: "Point" | "LineString";
        coordinates: number[] | number[][];
    };
}

/**
 * Фейковые данные сервера.
 * Содержат географические объекты Москвы: точки, линии и кольца (Садовое, ТТК, МКАД).
 */
const MOCK_SERVER_DATA: ServerGeoAsset[] = [
    // ----- Точки -----
    { Id: 1, Title: "Point Asset 1", LocationDisposition: { type: "Point", coordinates: [37.6205, 55.7539] } }, // Кремль
    { Id: 2, Title: "Point Asset 2", LocationDisposition: { type: "Point", coordinates: [37.6118, 55.7601] } }, // Красная площадь
    { Id: 3, Title: "Point Asset 3", LocationDisposition: { type: "Point", coordinates: [37.6436, 55.7412] } }, // Парк Зарядье
    { Id: 4, Title: "Point Asset 4", LocationDisposition: { type: "Point", coordinates: [37.5950, 55.7600] } }, // Китай-город
    { Id: 5, Title: "Point Asset 5", LocationDisposition: { type: "Point", coordinates: [37.6750, 55.9110] } }, // Север Москвы, почти Химки

    // ----- Линии -----
    {
        Id: 6,
        Title: "Line Asset 1",
        LocationDisposition: {
            type: "LineString",
            coordinates: [
                [37.6156, 55.7558],
                [37.6200, 55.7580],
                [37.6250, 55.7565],
                [37.6300, 55.7540],
            ],
        },
    },
    {
        Id: 7,
        Title: "Line Asset 2",
        LocationDisposition: {
            type: "LineString",
            coordinates: [
                [37.6050, 55.7480],
                [37.6100, 55.7500],
                [37.6150, 55.7490],
            ],
        },
    },

    // ----- Московские кольца -----
    {
        Id: 100,
        Title: "Sadovoe Ring",
        LocationDisposition: {
            type: "LineString",
            coordinates: [
                [37.6070, 55.7535],
                [37.6150, 55.7570],
                [37.6250, 55.7570],
                [37.6350, 55.7530],
                [37.6320, 55.7480],
                [37.6220, 55.7460],
                [37.6120, 55.7480],
                [37.6070, 55.7535], // замкнули кольцо
            ],
        },
    },
    {
        Id: 101,
        Title: "TTK",
        LocationDisposition: {
            type: "LineString",
            coordinates: [
                [37.618, 55.751],
                [37.630, 55.756],
                [37.645, 55.753],
                [37.650, 55.745],
                [37.638, 55.740],
                [37.623, 55.742],
                [37.618, 55.751], // замкнули кольцо
            ],
        },
    },
    {
        Id: 102,
        Title: "MKAD",
        LocationDisposition: {
            type: "LineString",
            coordinates: [
                [37.60, 55.82],
                [37.65, 55.84],
                [37.70, 55.82],
                [37.75, 55.80],
                [37.78, 55.75],
                [37.75, 55.70],
                [37.70, 55.68],
                [37.65, 55.70],
                [37.60, 55.72],
                [37.60, 55.82], // замкнули кольцо
            ],
        },
    },
];

/**
 * Асинхронная функция для получения географических данных.
 * Эмулирует сетевой запрос к серверу и возвращает данные в формате GeoData проекта.
 *
 * @returns {Promise<GeoData>} - Преобразованные геоданные для отображения на карте.
 */
export const fetchGeoData = async (): Promise<GeoData> => {
    // Симуляция сетевой задержки для реалистичного поведения приложения
    await new Promise<void>((resolve) => setTimeout(resolve, SERVER_DELAY_MS));

    // Преобразуем данные сервера в внутренний формат GeoData
    const geoData: GeoData = normalizeServerDataToGeoData(MOCK_SERVER_DATA);

    return geoData;
};
