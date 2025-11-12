import React, { FC, useEffect, useRef } from "react";
import styles from "./YandexEngine.module.scss";

declare global {
  interface Window {
    ymaps?: any;
  }
}

// Глобальный промис для предотвращения повторной загрузки Яндекс.Карт
let yandexMapsPromise: Promise<void> | null = null;

/** Динамическая загрузка API Яндекс.Карт */
const loadYandexMaps = (apiKey: string): Promise<void> => {
  if (yandexMapsPromise) return yandexMapsPromise;

  yandexMapsPromise = new Promise((resolve, reject) => {
    if (window.ymaps && window.ymaps.ready) {
      window.ymaps.ready(() => resolve());
      return;
    }

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      if (window.ymaps && window.ymaps.ready) {
        window.ymaps.ready(() => resolve());
      } else {
        reject(new Error("Yandex Maps loaded but ymaps is undefined"));
      }
    };

    script.onerror = () => reject(new Error("Failed to load Yandex Maps"));
    document.head.appendChild(script);
  });

  return yandexMapsPromise;
};

interface YandexEngineProps {
  providerId: string;
  drawMarkerOn?: boolean;
  markerIconUrl?: string;
}

/**
 * YandexEngine — компонент для отображения карты Яндекс с поддержкой маркеров.
 */
const YandexEngine: FC<YandexEngineProps> = ({
  providerId,
  drawMarkerOn = false,
  markerIconUrl,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null); // DOM-контейнер карты
  const mapRef = useRef<any>(null); // Экземпляр карты
  const markersRef = useRef<any[]>([]); // Добавленные маркеры

  useEffect(() => {
    const apiKey = (import.meta.env as any).VITE_YANDEX_API_KEY;
    if (!apiKey || !containerRef.current) {
      console.error("VITE_YANDEX_API_KEY is not defined or container is missing");
      return;
    }

    let isUnmounted = false;

    const initializeMap = async () => {
      try {
        await loadYandexMaps(apiKey);
        if (isUnmounted || !containerRef.current) return;

        // Определяем тип карты в зависимости от провайдера
        const mapType =
          providerId === "YandexSatellite"
            ? "yandex#satellite"
            : providerId === "YandexHybrid"
            ? "yandex#hybrid"
            : "yandex#map";

        // Инициализация карты, если ещё не создана
        if (!mapRef.current) {
          mapRef.current = new window.ymaps.Map(containerRef.current, {
            center: [55.7558, 37.6173], // Москва
            zoom: 10,
            type: mapType,
            controls: [],
          });
        } else {
          mapRef.current.setType(mapType);
        }

        const map = mapRef.current;

        // Удаляем предыдущий обработчик клика, если был
        if ((map as any)._clickHandler) {
          map.events.remove("click", (map as any)._clickHandler);
          (map as any)._clickHandler = null;
        }

        // Добавляем обработчик клика для добавления маркеров
        if (drawMarkerOn) {
          const handleClick = (e: any) => {
            const coords = e.get("coords");
            const placemark = new window.ymaps.Placemark(coords, {}, {
              iconLayout: "default#image",
              iconImageHref:
                markerIconUrl || "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
              iconImageSize: [32, 32],
              draggable: true,
            });

            map.geoObjects.add(placemark);
            markersRef.current.push(placemark);
          };

          map.events.add("click", handleClick);
          (map as any)._clickHandler = handleClick;
        }
      } catch (err) {
        console.error("Ошибка инициализации Яндекс.Карт:", err);
      }
    };

    initializeMap();

    return () => {
      isUnmounted = true;
      const map = mapRef.current;
      if (!map) return;

      // Удаляем все маркеры при размонтировании
      markersRef.current.forEach((marker) => map.geoObjects.remove(marker));
      markersRef.current = [];

      if ((map as any)._clickHandler) {
        map.events.remove("click", (map as any)._clickHandler);
        (map as any)._clickHandler = null;
      }
    };
  }, [providerId, drawMarkerOn, markerIconUrl]);

  return <div ref={containerRef} className={styles.mapContainer} />;
};

export default YandexEngine;
