import { useEffect, useCallback, RefObject } from "react";
import { GeoData, GeoFeature } from "../geoDataType";
import { normalizeGeoData } from "../../utils/geoDataNormalizer";

/**
 * Props компонента GoogleGeoRenderer
 */
interface GoogleGeoRendererProps {
  /** Ссылка на объект карты Google */
  map: google.maps.Map | null;
  /** Временные геоданные для рендеринга */
  tempGeoData: GeoData;
  /** Сохранённые геоданные для рендеринга */
  savedGeoData: GeoData;
  /** URL иконки маркера (опционально) */
  markerIconUrl?: string;
  /** Ref для хранения маркеров точек */
  pointMarkersRef: RefObject<Map<string, google.maps.Marker>>;
  /** Ref для хранения полилиний */
  polylinesRef: RefObject<Map<string, google.maps.Polyline>>;
  /** Ref для хранения маркеров вершин полилиний */
  polylineVertexMarkersRef: RefObject<Map<string, google.maps.Marker[]>>;
}

/**
 * Генератор иконки для вершин полилинии Google Maps
 * @param size размер иконки в пикселях (по умолчанию 10)
 * @returns объект конфигурации иконки Google Maps
 */
const VERTEX_ICON = (size = 10) => ({
  url:
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="white" stroke="black" stroke-width="1"/>
      </svg>`),
  scaledSize: new google.maps.Size(size, size),
});

/**
 * Проверка, является ли feature линией (LineString)
 * @param f - гео-фича
 * @returns true, если feature является линией
 */
const isLineFeature = (
  f: GeoFeature
): f is GeoFeature & { geometry: { type: "LineString"; coordinates: [number, number][] } } =>
  f.geometry.type === "LineString";

/**
 * Проверка, является ли feature точкой (Point)
 * @param f - гео-фича
 * @returns true, если feature является точкой
 */
const isPointFeature = (
  f: GeoFeature
): f is GeoFeature & { geometry: { type: "Point"; coordinates: [number, number] } } =>
  f.geometry.type === "Point";

/**
 * Компонент рендеринга геоданных на карте Google.
 * - Отображает точки как маркеры.
 * - Отображает линии как полилинии с маркерами вершин.
 * - Синхронизирует состояние карты с актуальными данными.
 */
export const GoogleGeoRenderer = ({
  map,
  tempGeoData,
  savedGeoData,
  markerIconUrl,
  pointMarkersRef,
  polylinesRef,
  polylineVertexMarkersRef,
}: GoogleGeoRendererProps) => {
  /**
   * Рендер маркеров точек на карте Google.
   * - Добавляет новые маркеры.
   * - Обновляет позиции существующих.
   * - Удаляет устаревшие маркеры.
   */
  const renderMarkers = useCallback(() => {
    if (!map || !pointMarkersRef.current) return;

    // Объединяем временные и сохранённые данные и нормализуем их
    const allGeo = normalizeGeoData({
      type: "FeatureCollection",
      features: [...(savedGeoData.features ?? []), ...(tempGeoData.features ?? [])],
    });

    // Фильтруем только точки
    const points = allGeo.features.filter(isPointFeature);
    const pointIds = new Set(points.map(f => f.properties.id));

    // Удаляем маркеры, которых нет в актуальных данных
    pointMarkersRef.current.forEach((marker, id) => {
      if (!pointIds.has(id)) {
        marker.setMap(null);
        pointMarkersRef.current!.delete(id);
      }
    });

    // Создаём новые маркеры или обновляем существующие
    points.forEach(f => {
      const id = f.properties.id;
      const [lng, lat] = f.geometry.coordinates as [number, number];

      if (!pointMarkersRef.current!.has(id)) {
        const marker = new google.maps.Marker({
          position: new google.maps.LatLng(lat, lng),
          map,
          icon: markerIconUrl
            ? { url: markerIconUrl, scaledSize: new google.maps.Size(32, 32) }
            : undefined,
        });
        pointMarkersRef.current!.set(id, marker);
      } else {
        pointMarkersRef.current!.get(id)!.setPosition(new google.maps.LatLng(lat, lng));
      }
    });
  }, [map, tempGeoData, savedGeoData, markerIconUrl, pointMarkersRef]);

  /**
   * Рендер полилиний и маркеров вершин на карте Google.
   * - Обновляет существующие полилинии и маркеры вершин.
   * - Создаёт новые полилинии и маркеры вершин.
   * - Удаляет устаревшие объекты.
   */
  const renderLines = useCallback(() => {
    if (!map || !polylinesRef.current || !polylineVertexMarkersRef.current) return;

    // Объединяем данные и нормализуем
    const allGeo = normalizeGeoData({
      type: "FeatureCollection",
      features: [...(savedGeoData.features ?? []), ...(tempGeoData.features ?? [])],
    });

    // Фильтруем линии
    const lines = allGeo.features.filter(isLineFeature);
    const lineIds = new Set(lines.map(f => f.properties.id));

    // Удаляем устаревшие полилинии и маркеры вершин
    Array.from(polylinesRef.current.keys()).forEach(id => {
      if (!lineIds.has(id)) {
        polylinesRef.current.get(id)?.setMap(null);
        polylinesRef.current.delete(id);

        polylineVertexMarkersRef.current.get(id)?.forEach(m => m.setMap(null));
        polylineVertexMarkersRef.current.delete(id);
      }
    });

    // Создаём или обновляем полилинии и маркеры вершин
    lines.forEach(line => {
      const id = line.properties.id;
      const coords = line.geometry.coordinates as [number, number][];
      const path = coords.map(([lng, lat]) => new google.maps.LatLng(lat, lng));

      // Создаём полилинию, если она отсутствует, иначе обновляем путь
      let polyline = polylinesRef.current.get(id);
      if (!polyline) {
        polyline = new google.maps.Polyline({
          map,
          path,
          strokeColor: "#FF0000",
          strokeOpacity: 1,
          strokeWeight: 3,
        });
        polylinesRef.current.set(id, polyline);
      } else {
        polyline.setPath(path);
      }

      // Создаём или синхронизируем маркеры вершин
      let markers = polylineVertexMarkersRef.current.get(id) || [];

      // Удаляем лишние маркеры, если координат стало меньше
      if (markers.length > coords.length) {
        for (let i = coords.length; i < markers.length; i++) {
          markers[i].setMap(null);
        }
        markers = markers.slice(0, coords.length);
      }

      // Добавляем новые маркеры для новых координат
      for (let i = markers.length; i < coords.length; i++) {
        const [lng, lat] = coords[i];
        markers.push(
          new google.maps.Marker({
            position: new google.maps.LatLng(lat, lng),
            map,
            icon: VERTEX_ICON(),
            clickable: false,
          })
        );
      }

      polylineVertexMarkersRef.current.set(id, markers);
    });
  }, [map, tempGeoData, savedGeoData, polylinesRef, polylineVertexMarkersRef]);

  /**
   * Основной рендер всех геоданных
   * - Сначала линии и вершины.
   * - Затем точечные маркеры.
   */
  const renderGeoData = useCallback(() => {
    renderLines();
    renderMarkers();
  }, [renderLines, renderMarkers]);

  /**
   * Эффект для автоматического рендера при изменении карты или данных
   */
  useEffect(() => {
    if (!map) return;
    renderGeoData();
  }, [map, renderGeoData]);

  return null;
};
