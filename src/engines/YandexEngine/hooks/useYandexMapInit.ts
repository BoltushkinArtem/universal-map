import { useEffect, useRef, useState } from "react";
import { MapConfig } from "../../mapConfig";
import { toYandexCoords } from "../utils/coordinateConverter";

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
 * @param apiKey - API ключ для Yandex Maps
 * @returns Promise<void> — резолвится после ymaps.ready
 */
const loadYandexMaps = (apiKey: string): Promise<void> => {
    if (yandexMapsPromise) return yandexMapsPromise;

    yandexMapsPromise = new Promise((resolve, reject) => {
        if (window.ymaps && window.ymaps.ready) {
            window.ymaps.ready(resolve);
            return;
        }

        const script = document.createElement("script");
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
        script.async = true;

        script.onload = () => window.ymaps?.ready(resolve);
        script.onerror = () => reject(new Error("Failed to load Yandex Maps API"));

        document.head.appendChild(script);
    });

    return yandexMapsPromise;
};

/**
 * Пропсы хука useYandexMapInit
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
 * 1. Загружает Yandex Maps API (один раз на сессию).
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

        /** Получение API ключа из переменных окружения */
        const apiKey = (import.meta.env as any).VITE_YANDEX_API_KEY;
        if (!apiKey) {
            console.error("Yandex API key is missing");
            return;
        }

        /**
         * Инициализация карты Yandex
         */
        const initMap = async () => {
            try {
                // Загружаем Yandex Maps API
                await loadYandexMaps(apiKey);

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
