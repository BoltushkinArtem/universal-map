import { MapConfig } from "../engines/mapConfig";
import { PROVIDERS } from "./providerList";

/**
 * Кеш конфигураций и тайлов провайдеров карт.
 * 
 * - Ключ: уникальный идентификатор провайдера карты.
 * - Значение: объект с конфигурацией карты и массивом URL тайлов.
 * 
 * Используется для:
 * - Ускорения повторных вызовов функций `getProviderConfig` и `tileTemplate`.
 * - Избежания повторного клонирования данных.
 */
const providerConfigCache = new Map<string, { config: MapConfig; tiles: string[] }>();

/**
 * Возвращает массив URL шаблонов тайлов для выбранного провайдера MapLibre.
 * 
 * Функция использует кеш для ускорения повторных вызовов.
 * Для провайдеров без тайлов возвращает пустой массив.
 *
 * @param providerId - уникальный идентификатор провайдера
 * @returns Массив строк с URL шаблонами тайлов или пустой массив
 */
export const tileTemplate = (providerId: string): string[] => {
    // Проверка кеша: если данные уже есть, возвращаем их копию
    if (providerConfigCache.has(providerId)) {
        return structuredClone(providerConfigCache.get(providerId)!.tiles ?? []);
    }

    // Поиск провайдера в списке PROVIDERS
    const provider = PROVIDERS.find((p) => p.id === providerId);

    // Если провайдер не найден, возвращаем пустой массив и выводим предупреждение
    if (!provider) {
        console.warn(`Provider not found: ${providerId}`);
        return [];
    }

    // Сохраняем конфигурацию и тайлы в кеш для последующего использования
    providerConfigCache.set(providerId, { config: provider.config, tiles: provider.tiles ?? [] });

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

    // Если провайдер не найден, выбрасываем ошибку
    if (!provider) {
        throw new Error(`Provider config not found: ${providerId}`);
    }

    // Сохраняем конфигурацию и тайлы в кеш для последующего использования
    providerConfigCache.set(providerId, { config: provider.config, tiles: provider.tiles ?? [] });

    // Возвращаем структурную копию конфигурации, чтобы избежать мутаций внешним кодом
    return structuredClone(provider.config);
};
