import { useEffect, useCallback, RefObject } from "react";
import { GeoData, GeoFeature } from "../geoDataType";
import { toYandexCoords } from "./utils/coordinateConverter";

/** 
 * Props для компонента YandexGeoRenderer 
 */
interface YandexGeoRendererProps {
  /** Экземпляр карты Yandex */
  map: any;
  /** Временные геоданные, создаваемые пользователем */
  tempGeoData: GeoData;
  /** Сохраненные геоданные (опционально) */
  savedGeoData?: GeoData;
  /** URL иконки для точечных маркеров */
  markerIconUrl?: string;
  /** Ref для хранения созданных маркеров и полилиний */
  markersRef: RefObject<Map<string, any>>;
}

/**
 * Компонент рендерит геоданные на карте Yandex.
 * - Точки отображаются как маркеры.
 * - Линии отображаются как полигоны с вершинными квадратиками.
 * 
 * @param props - свойства компонента
 */
export const YandexGeoRenderer = ({
  map,
  tempGeoData,
  savedGeoData,
  markerIconUrl,
  markersRef,
}: YandexGeoRendererProps) => {

  /**
   * Проверка, является ли feature линией (LineString)
   * @param f - гео-фича
   * @returns true, если feature является линией
   */
  const isLineFeature = (f: GeoFeature): f is GeoFeature & { geometry: { type: "LineString"; coordinates: [number, number][] } } =>
    f.geometry.type === "LineString";

  /**
   * Проверка, является ли feature точкой (Point)
   * @param f - гео-фича
   * @returns true, если feature является точкой
   */
  const isPointFeature = (f: GeoFeature): f is GeoFeature & { geometry: { type: "Point"; coordinates: [number, number] } } =>
    f.geometry.type === "Point";

  /**
   * Рендер точечных маркеров на карте Yandex.
   * Добавляет новые маркеры, обновляет координаты существующих и удаляет лишние.
   */
  const renderMarkers = useCallback(() => {
    if (!map || !markersRef.current) return;

    // Объединяем сохранённые и временные точки
    const allPoints = [...(savedGeoData?.features ?? []), ...tempGeoData.features].filter(isPointFeature);

    // Множество актуальных ID точек
    const currentIds = new Set<string>();

    // Проходим по всем точкам
    allPoints.forEach(feature => {
      const id = feature.properties?.id?.toString();
      if (!id) return; // игнорируем без ID
      currentIds.add(id);

      const coords = toYandexCoords(feature.geometry.coordinates);
      let marker = markersRef.current.get(id);

      if (marker) {
        // Обновляем координаты существующего маркера
        marker.geometry.setCoordinates(coords);
      } else {
        // Создаем новый маркер
        marker = new window.ymaps.Placemark(coords, {}, {
          iconLayout: "default#image",
          iconImageHref: markerIconUrl ?? "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
          iconImageSize: [32, 32],
          draggable: true,
        });
        map.geoObjects.add(marker);
        markersRef.current.set(id, marker);
      }
    });

    // Удаляем маркеры, которых больше нет в данных
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id) && !marker.main) {
        map.geoObjects.remove(marker);
        markersRef.current.delete(id);
      }
    });
  }, [map, markerIconUrl, savedGeoData, tempGeoData, markersRef]);

  /**
   * Рендер линий и квадратиков вершин на карте Yandex.
   * Синхронизирует существующие линии и квадратики с актуальными координатами.
   */
  const renderLines = useCallback(() => {
    if (!map || !markersRef.current) return;

    // Объединяем сохранённые и временные линии
    const allLines = [...(savedGeoData?.features ?? []), ...tempGeoData.features].filter(isLineFeature);
    const currentIds = new Set<string>();

    allLines.forEach(feature => {
      const id = feature.properties?.id?.toString();
      if (!id) return; // игнорируем без ID
      currentIds.add(id);

      const coords = feature.geometry.coordinates.map(toYandexCoords);
      let item = markersRef.current.get(id);

      if (item) {
        // Обновляем полилинию
        item.main.geometry.setCoordinates(coords);

        // Синхронизация квадратиков с количеством координат
        const squares = item.squares;

        // Удаляем лишние квадратики
        if (squares.length > coords.length) {
          for (let i = coords.length; i < squares.length; i++) {
            map.geoObjects.remove(squares[i]);
          }
          item.squares = squares.slice(0, coords.length);
        }

        // Добавляем недостающие квадратики
        if (squares.length < coords.length) {
          for (let i = squares.length; i < coords.length; i++) {
            const sq = new window.ymaps.Placemark(coords[i], {}, {
              iconLayout: "default#image",
              iconImageHref: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
                  <rect width="10" height="10" fill="white" stroke="black" stroke-width="1"/>
                </svg>
              `)}`,
              iconImageSize: [10, 10],
              iconImageOffset: [-5, -5],
              draggable: false,
            });
            map.geoObjects.add(sq);
            item.squares.push(sq);
          }
        }

        // Обновляем координаты всех квадратиков
        for (let i = 0; i < coords.length; i++) {
          squares[i].geometry.setCoordinates(coords[i]);
        }

      } else {
        // Создаем новую полилинию
        const poly = new window.ymaps.Polyline(coords, {}, {
          strokeColor: "#FF0000",
          strokeWidth: 3,
          strokeOpacity: 1,
        });

        // Создаем квадратики для вершин
        const squares = coords.map(coord => {
          const sq = new window.ymaps.Placemark(coord, {}, {
            iconLayout: "default#image",
            iconImageHref: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
                <rect width="10" height="10" fill="white" stroke="black" stroke-width="1"/>
              </svg>
            `)}`,
            iconImageSize: [10, 10],
            iconImageOffset: [-5, -5],
            draggable: false,
          });
          map.geoObjects.add(sq);
          return sq;
        });

        map.geoObjects.add(poly);
        markersRef.current.set(id, { main: poly, squares });
      }
    });

    // Удаляем линии и квадратики, которых больше нет в данных
    markersRef.current.forEach((item, id) => {
      if (item.main && !currentIds.has(id)) {
        map.geoObjects.remove(item.main);
        item.squares.forEach((sq: any) => map.geoObjects.remove(sq));
        markersRef.current.delete(id);
      }
    });
  }, [map, savedGeoData, tempGeoData, markersRef]);

  /**
   * Рендер всех геоданных на карте:
   * 1. Сначала линии и квадратики.
   * 2. Затем точечные маркеры.
   */
  const renderGeoData = useCallback(() => {
    renderLines();
    renderMarkers();
  }, [renderLines, renderMarkers]);

  /**
   * Эффект, вызывающий рендер при изменении карты или геоданных.
   * Перерисовывает линии и маркеры при изменении tempGeoData или savedGeoData.
   */
  useEffect(() => {
    if (!map) return;
    renderGeoData();
  }, [map, tempGeoData, savedGeoData, renderGeoData]);

  return null;
};
