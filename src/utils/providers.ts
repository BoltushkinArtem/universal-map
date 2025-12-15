import { MapConfig } from "../engines/mapConfig";
import { PROVIDERS, MapProvider } from "./providerList";

/**
 * Кеш конфигураций, тайлов и src провайдеров карт.
 * 
 * Ключ: уникальный идентификатор провайдера карты.
 * Значение: объект с конфигурацией карты, массивом URL тайлов и src (для SDK).
 * 
 * Используется для:
 * - Ускорения повторных вызовов функций `getProviderConfig`, `tileTemplate`, `getProviderSrc`
 * - Избежания повторного клонирования данных
 */
const providerConfigCache = new Map<string, { config: MapConfig; tiles: string[]; src?: string }>();

/**
 * Приватная функция для сохранения провайдера в кэш.
 * 
 * @param provider - объект провайдера карты
 */
const cacheProvider = (provider: MapProvider): void => {
    providerConfigCache.set(provider.id, {
        config: provider.config,
        tiles: provider.tiles ?? [],
        src: provider.src,
    });
};

/**
 * Возвращает массив URL шаблонов тайлов для выбранного провайдера MapLibre.
 * 
 * Использует кеш для ускорения повторных вызовов.
 * Для провайдеров без тайлов возвращает пустой массив.
 *
 * @param providerId - уникальный идентификатор провайдера
 * @returns Массив строк с URL шаблонами тайлов или пустой массив
 */
export const tileTemplate = (providerId: string): string[] => {
    // Проверка кеша: если данные уже есть, возвращаем их копию
    if (providerConfigCache.has(providerId)) {
        return structuredClone(providerConfigCache.get(providerId)!.tiles);
    }

    // Поиск провайдера в списке PROVIDERS
    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (!provider) {
        console.warn(`Provider not found: ${providerId}`);
        return [];
    }

    // Сохраняем провайдера в кэш
    cacheProvider(provider);

    // Возвращаем копию массива тайлов, чтобы избежать мутаций внешним кодом
    return structuredClone(provider.tiles ?? []);
};

/**
 * Возвращает конфигурацию карты для выбранного провайдера.
 * 
 * Использует кеш для ускорения повторных вызовов и предотвращает мутацию исходных данных.
 *
 * @param providerId - уникальный идентификатор провайдера
 * @throws Ошибка, если конфигурация для провайдера не найдена
 * @returns MapConfig — структурная копия конфигурации провайдера
 */
export const getProviderConfig = (providerId: string): MapConfig => {
    // Проверка кеша: если данные уже есть, возвращаем их копию
    if (providerConfigCache.has(providerId)) {
        return structuredClone(providerConfigCache.get(providerId)!.config);
    }

    // Поиск провайдера в списке PROVIDERS
    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (!provider) {
        throw new Error(`Provider config not found: ${providerId}`);
    }

    // Сохраняем провайдера в кэш
    cacheProvider(provider);

    // Возвращаем структурную копию конфигурации
    return structuredClone(provider.config);
};

/**
 * Возвращает URL скрипта API или SDK для выбранного провайдера (например, Yandex или Google Maps).
 * 
 * Использует кеш для ускорения повторных вызовов.
 *
 * @param providerId - уникальный идентификатор провайдера
 * @returns URL скрипта API или undefined, если src не определён
 */
export const getProviderSrc = (providerId: string): string | undefined => {
    // Проверка кеша: если данные уже есть, возвращаем src
    if (providerConfigCache.has(providerId)) {
        return providerConfigCache.get(providerId)!.src;
    }

    // Поиск провайдера в списке PROVIDERS
    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (!provider) {
        console.warn(`Provider not found: ${providerId}`);
        return undefined;
    }

    // Сохраняем провайдера в кэш
    cacheProvider(provider);

    // Возвращаем src
    return provider.src;
};
