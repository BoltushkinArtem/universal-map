import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    ymaps?: any;
  }
}

/**
 * Хранит Promise загрузки Yandex Maps API.
 * Используется для того, чтобы API загружалось только один раз.
 */
let yandexMapsPromise: Promise<void> | null = null;

/**
 * Загружает Yandex Maps API один раз.
 *
 * @param apiKey - API ключ для Yandex Maps
 * @returns Promise, который резолвится, когда ymaps.ready выполнено
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
 * Хук инициализации Yandex Map.
 *
 * Отвечает за:
 * 1. Загрузку Yandex Maps API
 * 2. Создание экземпляра карты
 * 3. Присвоение уникального ID контейнеру (для локальных стилей)
 * 4. Очистку карты при размонтировании компонента
 *
 * @param containerRef - Ref на DOM-элемент контейнера карты
 * @param providerId - Тип карты ("YandexSatellite" | "YandexHybrid" | "YandexMap")
 * @returns Объект с mapRef (экземпляр карты), containerIdRef (ID контейнера) и mapLoaded (флаг готовности)
 */
export const useYandexMapInit = (
  containerRef: React.RefObject<HTMLDivElement>,
  providerId: string
) => {
  /** Ref для хранения экземпляра Yandex Map */
  const mapRef = useRef<any>(null);

  /** Ref для хранения уникального ID контейнера карты */
  const containerIdRef = useRef<string | null>(null);

  /** Флаг готовности карты */
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Генерируем уникальный ID контейнера, если ещё не создан
    if (!containerIdRef.current) {
      containerIdRef.current = `yandex-map-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      containerRef.current.id = containerIdRef.current;
    }

    /** Флаг, чтобы игнорировать изменения после размонтирования */
    let isUnmounted = false;

    /** Получаем API ключ из переменных окружения */
    const apiKey = (import.meta.env as any).VITE_YANDEX_API_KEY;
    if (!apiKey) {
      console.error("Yandex API key is missing");
      return;
    }

    /**
     * Инициализация карты
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
            center: [55.7558, 37.6173], // Москва по умолчанию
            zoom: 10,
            type: mapType,
            controls: [], // убираем стандартные контролы
          });

        mapRef.current = map;
        map.setType(mapType);

        setMapLoaded(true);
      } catch (err) {
        console.error("Failed to initialize Yandex Map:", err);
      }
    };

    initMap();

    /** Очистка карты при размонтировании компонента */
    return () => {
      isUnmounted = true;
      if (mapRef.current) {
        mapRef.current.destroy?.();
        mapRef.current = null;
      }
    };
  }, [containerRef, providerId]);

  return {
    mapRef,
    containerIdRef,
    mapLoaded,
  };
};
