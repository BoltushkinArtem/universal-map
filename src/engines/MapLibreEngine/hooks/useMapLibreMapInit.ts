import { useEffect, useRef, useState, RefObject } from "react";
import maplibregl, { Map as MapLibreMapInit } from "maplibre-gl";
import { tileTemplate } from "../../../utils/providers";

/**
 * Начальная позиция карты [долгота, широта].
 * Используется при инициализации карты по умолчанию.
 */
const DEFAULT_CENTER: [number, number] = [37.6173, 55.7558];

/**
 * Начальный масштаб карты при инициализации.
 */
const DEFAULT_ZOOM = 10;

/**
 * Проверяет, поддерживается ли WebGL в текущем браузере.
 *
 * @returns true, если WebGL доступен, иначе false
 */
const isWebGLAvailable = (): boolean => {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
};

/**
 * Пропсы для хука useMapLibreMapInit
 */
interface UseMapLibreMapInitProps {
  /** Ref на контейнер карты */
  containerRef: RefObject<HTMLDivElement>;
  /** Идентификатор провайдера для подгрузки тайлов */
  providerId: string;
}

/**
 * Хук для инициализации карты MapLibre
 *
 * Логика:
 * 1. Проверяет поддержку WebGL и наличие контейнера.
 * 2. Создает экземпляр карты MapLibre с базовым стилем и координатами.
 * 3. После загрузки карты добавляет кастомный базовый слой (raster tiles) для провайдера.
 * 4. Добавляет специальное изображение "white-square" для рендеринга вершин линий.
 * 5. Возвращает Ref на карту и состояние готовности карты (mapReady).
 *
 * @param props - свойства хука
 * @returns Объект с mapRef и флагом mapReady
 */
export const useMapLibreMapInit = ({
  containerRef,
  providerId,
}: UseMapLibreMapInitProps) => {
  /** Ref для хранения экземпляра карты */
  const mapRef = useRef<MapLibreMapInit | null>(null);

  /** Флаг, указывающий, что карта полностью загружена и готова к взаимодействию */
  const [mapReady, setMapReady] = useState<boolean>(false);

  useEffect(() => {
    // Если контейнер отсутствует или WebGL не поддерживается — выходим
    if (!containerRef.current || !isWebGLAvailable()) return;

    // Создание карты с дефолтным стилем, центром и масштабом
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    // Сохраняем ссылку на карту в Ref
    mapRef.current = map;

    /**
     * Callback на событие загрузки карты ("load")
     * - Добавляет кастомный источник тайлов для провайдера
     * - Добавляет изображение "white-square" для вершин линий
     */
    const onLoad = () => {
      const tiles = tileTemplate(providerId);

      // Добавляем базовый слой с тайлами провайдера, если он задан
      if (tiles?.length && !map.getSource("basemap")) {
        map.addSource("basemap", { type: "raster", tiles, tileSize: 256 });
        map.addLayer({ id: "basemap", type: "raster", source: "basemap" });
      }

      // Добавляем специальное изображение для вершин линий
      if (!map.hasImage("white-square")) {
        const size = 8;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, size, size);
          map.addImage("white-square", ctx.getImageData(0, 0, size, size));
        }
      }
    };

    // Подписка на событие загрузки карты
    map.on("load", onLoad);

    // После того как карта станет idle, считаем её готовой
    map.on("idle", () => setMapReady(true));

    /**
     * Очистка при размонтировании компонента:
     * - Убираем подписку на событие load
     * - Удаляем карту из DOM
     * - Сбрасываем Ref
     */
    return () => {
      map.off("load", onLoad);
      map.remove();
      mapRef.current = null;
    };
  }, [containerRef, providerId]);

  // Возвращаем Ref на карту и флаг готовности
  return { mapRef, mapReady };
};
