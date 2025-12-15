import { useEffect, useRef, useState } from "react";
import { MapConfig } from "../../mapConfig";
import { toYandexCoords } from "../utils/coordinateConverter";
import { getProviderSrc } from "../../../utils/providers";

declare global {
    interface Window {
        ymaps?: any;
    }
}

/**
 * Хранит Promise загрузки Yandex Maps API.
 * Используется, чтобы API загружался только один раз за сессию.
 */
let yandexMapsPromise: Promise<void> | null = null;

/**
 * Асинхронная загрузка Yandex Maps API один раз.
 *
 * @param src - URL скрипта Yandex Maps API
 * @returns Promise<void> — резолвится после ymaps.ready
 */
const loadYandexMaps = (src: string): Promise<void> => {
    if (yandexMapsPromise) return yandexMapsPromise;

    yandexMapsPromise = new Promise((resolve, reject) => {
        // Если API уже загружено, ждём ymaps.ready
        if (window.ymaps && window.ymaps.ready) {
            window.ymaps.ready(resolve);
            return;
        }

        // Создаем скрипт для загрузки Yandex Maps
        const script = document.createElement("script");
        script.src = src;
        script.async = true;

        // После загрузки вызываем ymaps.ready
        script.onload = () => window.ymaps?.ready(resolve);

        // Обработка ошибок загрузки
        script.onerror = () => reject(new Error("Failed to load Yandex Maps API"));

        document.head.appendChild(script);
    });

    return yandexMapsPromise;
};

/**
 * Пропсы хука useYandexMapInit.
 */
interface UseYandexMapInitProps {
    /** Ref на DOM-контейнер карты */
    containerRef: React.RefObject<HTMLDivElement>;

    /** Тип карты: YandexMap | YandexSatellite | YandexHybrid */
    providerId: string;

    /** Конфигурация карты: центр и zoom */
    mapConfig: MapConfig;
}

/**
 * useYandexMapInit — хук инициализации Yandex Map.
 *
 * Логика:
 * 1. Загружает Yandex Maps API один раз за сессию.
 * 2. Создает экземпляр карты в containerRef.
 * 3. Присваивает уникальный ID контейнеру для локальных стилей/селектора.
 * 4. Управляет жизненным циклом карты и её очисткой при размонтировании.
 *
 * @param props.containerRef - ref на DOM контейнер
 * @param props.providerId - тип карты
 * @param props.mapConfig - центр и zoom карты
 * @returns {object} { mapRef, containerIdRef, mapLoaded }
 */
export const useYandexMapInit = ({
    containerRef,
    providerId,
    mapConfig,
}: UseYandexMapInitProps) => {
    /** Ref на экземпляр Yandex Map */
    const mapRef = useRef<any>(null);

    /** Ref с уникальным ID контейнера карты */
    const containerIdRef = useRef<string | null>(null);

    /** Флаг готовности карты */
    const [mapLoaded, setMapLoaded] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        // Генерация уникального ID контейнера один раз
        if (!containerIdRef.current) {
            containerIdRef.current = `yandex-map-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`;
            containerRef.current.id = containerIdRef.current;
        }

        /** Флаг для игнорирования изменений после размонтирования */
        let isUnmounted = false;

        const src = getProviderSrc(providerId);
        if (!src?.length) {
            console.error("Yandex API src is missing");
            return;
        }

        /**
         * Инициализация карты Yandex
         */
        const initMap = async () => {
            try {
                // Загружаем Yandex Maps API
                await loadYandexMaps(src);

                if (isUnmounted || !containerRef.current) return;

                // Определяем тип карты в зависимости от providerId
                const mapType =
                    providerId === "YandexSatellite"
                        ? "yandex#satellite"
                        : providerId === "YandexHybrid"
                            ? "yandex#hybrid"
                            : "yandex#map";

                // Создаём карту, если ещё не создана
                const map =
                    mapRef.current ||
                    new window.ymaps.Map(containerRef.current, {
                        center: toYandexCoords([mapConfig.center.lng, mapConfig.center.lat]),
                        zoom: mapConfig.zoom,
                        type: mapType,
                        controls: [], // убираем стандартные контролы
                    });

                mapRef.current = map;
                map.setType(mapType);

                // Устанавливаем флаг готовности карты
                setMapLoaded(true);
            } catch (err) {
                console.error("Failed to initialize Yandex Map:", err);
            }
        };

        initMap();

        /** Очистка карты при размонтировании */
        return () => {
            isUnmounted = true;
            if (mapRef.current) {
                mapRef.current.destroy?.();
                mapRef.current = null;
            }
        };
    }, [containerRef, providerId, mapConfig]);

    // Возвращаем реф карты, ID контейнера и флаг готовности
    return {
        mapRef,
        containerIdRef,
        mapLoaded,
    };
};
