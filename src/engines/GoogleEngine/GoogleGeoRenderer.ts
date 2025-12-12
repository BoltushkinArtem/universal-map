import { useEffect } from "react";
import { GeoData } from "../geoDataType";
import { normalizeGeoData } from "../../utils/geoDataNormalizer";

/** Props компонента GoogleGeoRenderer */
interface GoogleGeoRendererProps {
  /** Ссылка на объект карты Google */
  map: google.maps.Map | null;
  /** Временные геоданные для рендеринга */
  tempGeoData: GeoData;
  /** Сохранённые геоданные для рендеринга */
  savedGeoData: GeoData;
  /** URL иконки маркера (опционально) */
  markerIconUrl?: string;
  /** Ссылки на маркеры точек */
  pointMarkersRef: React.MutableRefObject<Map<string, google.maps.Marker>>;
  /** Ссылки на полилинии */
  polylinesRef: React.MutableRefObject<Map<string, google.maps.Polyline>>;
  /** Ссылки на маркеры вершин полилиний */
  polylineVertexMarkersRef: React.MutableRefObject<Map<string, google.maps.Marker[]>>;
}

/** 
 * Функция создания иконки для вершины полилинии.
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
 * Компонент рендеринга геоданных на карте Google.
 * Обрабатывает точки и линии, синхронизирует маркеры и полилинии с текущими данными.
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
  useEffect(() => {
    if (!map) return;

    // --- Объединяем сохранённые и временные данные и нормализуем их ---
    const allGeo = normalizeGeoData({
      type: "FeatureCollection",
      features: [...(savedGeoData.features ?? []), ...(tempGeoData.features ?? [])],
    });

    // --- Рендер маркеров точек ---
    const points = allGeo.features.filter(f => f.properties.type === "marker");
    const pointIds = new Set(points.map(f => f.properties.id));

    // Удаляем устаревшие маркеры
    pointMarkersRef.current.forEach((marker, id) => {
      if (!pointIds.has(id)) {
        marker.setMap(null);
        pointMarkersRef.current.delete(id);
      }
    });

    // Добавляем или обновляем маркеры
    points.forEach(f => {
      const id = f.properties.id;
      const [lng, lat] = f.geometry.coordinates as [number, number];

      if (!pointMarkersRef.current.has(id)) {
        const marker = new google.maps.Marker({
          position: new google.maps.LatLng(lat, lng),
          map,
          icon: markerIconUrl
            ? { url: markerIconUrl, scaledSize: new google.maps.Size(32, 32) }
            : undefined,
        });
        pointMarkersRef.current.set(id, marker);
      } else {
        pointMarkersRef.current.get(id)!.setPosition(new google.maps.LatLng(lat, lng));
      }
    });

    // --- Рендер полилиний и их вершин ---
    const lines = allGeo.features.filter(
      f => f.properties.type === "polyline" && f.geometry.type === "LineString"
    );
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

    // Добавляем или обновляем полилинии и вершины
    lines.forEach(line => {
      const id = line.properties.id;
      const coords = line.geometry.coordinates as [number, number][];
      const path = coords.map(([lng, lat]) => new google.maps.LatLng(lat, lng));

      // Обновляем или создаём полилинию
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

      // Обновляем или создаём маркеры вершин
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
  }, [map, tempGeoData, savedGeoData, markerIconUrl]);

  return null;
};
