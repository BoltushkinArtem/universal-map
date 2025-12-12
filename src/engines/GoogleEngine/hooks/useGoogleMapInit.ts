import { useEffect, useCallback, useRef, useState, RefObject } from "react";
import { DrawActionType } from "../../drawActionType";

declare global {
  interface Window {
    google: typeof google;
  }
}

/**
 * Пропсы хука useGoogleMapInit
 */
interface UseGoogleMapInitProps {
  /** Ref на контейнер, в котором будет создана карта Google */
  containerRef: RefObject<HTMLDivElement>;

  /** Идентификатор провайдера карты: "GoogleSatellite" | "GoogleRoadmap" */
  providerId: string;

  /** Ref для хранения маркеров точек (map id -> google.maps.Marker) */
  pointMarkersRef: RefObject<Map<string, google.maps.Marker>>;

  /** Ref для хранения полилиний (map id -> google.maps.Polyline) */
  polylinesRef: RefObject<Map<string, google.maps.Polyline>>;

  /** Ref для хранения маркеров вершин полилиний (map id -> google.maps.Marker[]) */
  polylineVertexMarkersRef: RefObject<Map<string, google.maps.Marker[]>>;

  /**
   * Callback, вызываемый после полной загрузки карты.
   * Позволяет внешнему коду получить ссылку на созданный google.maps.Map.
   */
  onMapReady?: (map: google.maps.Map) => void;
}

/**
 * useGoogleMapInit — хук инициализации карты Google.
 *
 * Responsibilities (не изменять логику):
 * 1. Асинхронно загружает Google Maps JS API (если ещё не загружен).
 * 2. Создаёт экземпляр google.maps.Map в переданном контейнере.
 * 3. Управляет "чисткой" карты: удаляет слушатель клика, маркеры, полилинии и т.п.
 * 4. Создаёт уникальный id контейнера (нужно для CSS селекторов, курсора и т.п.).
 *
 * Возвращаемые значения:
 * - mapRef: Ref на созданный объект google.maps.Map или null до инициализации.
 * - mapReady: boolean — флаг, что карта полностью загружена и готова.
 * - containerIdRef: Ref со строковым id контейнера (удобно, если нужно вставлять <style> с селекторами).
 * - styleTagRef: Ref на динамически созданный <style> (если нужно управлять курсором через CSS).
 *
 * @param props.containerRef - ref контейнера, в котором создаётся карта
 * @param props.providerId - идентификатор провайдера (определяет basemap)
 * @param props.pointMarkersRef - ref контейнера маркеров точек
 * @param props.polylinesRef - ref контейнера полилиний
 * @param props.polylineVertexMarkersRef - ref контейнера маркеров вершин
 * @param props.onMapReady - опциональный callback при готовности карты
 */
export const useGoogleMapInit = ({
  containerRef,
  providerId,
  pointMarkersRef,
  polylinesRef,
  polylineVertexMarkersRef,
  onMapReady,
}: UseGoogleMapInitProps) => {
  /**
   * mapRef — ref на экземпляр google.maps.Map.
   * Будет заполнен после успешной инициализации API и создания Map.
   */
  const mapRef = useRef<google.maps.Map | null>(null);

  /**
   * styleTagRef — ref на динамически созданный тег <style>.
   * Используется, когда внешний код хочет вставлять CSS для контейнера карты
   * (например, чтобы управлять курсором через селектор `#containerId .gm-style`).
   */
  const styleTagRef = useRef<HTMLStyleElement | null>(null);

  /**
   * containerIdRef — уникальный строковый id для контейнера карты.
   * Нужен для построения CSS-селекторов, чтобы локализовать стили именно на эту карту.
   */
  const containerIdRef = useRef<string>("");

  /** Флаг готовности карты (true после события 'idle'). */
  const [mapReady, setMapReady] = useState<boolean>(false);

  /** Ref на слушатель клика карты (если понадобится извне). */
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  /**
   * cleanupMap — очищает карту от созданных объектов и слушателей.
   * - снимает слушатель клика,
   * - удаляет все маркеры точек,
   * - удаляет все полилинии,
   * - удаляет маркеры вершин,
   * - удаляет динамически созданный <style> (если он есть).
   *
   * Это важная часть корректного размонтирования/реинициализации карты.
   */
  const cleanupMap = useCallback(() => {
    // удаляем слушатель клика (если был установлен)
    clickListenerRef.current?.remove();
    clickListenerRef.current = null;

    // удаляем и очищаем коллекцию маркеров точек
    pointMarkersRef.current?.forEach((marker) => marker.setMap(null));
    pointMarkersRef.current?.clear();

    // удаляем и очищаем коллекцию полилиний
    polylinesRef.current?.forEach((polyline) => polyline.setMap(null));
    polylinesRef.current?.clear();

    // удаляем и очищаем маркеры вершин для каждой полилинии
    polylineVertexMarkersRef.current?.forEach((markers) =>
      markers.forEach((marker) => marker.setMap(null))
    );
    polylineVertexMarkersRef.current?.clear();

    // удаляем динамически созданный <style> если он существует
    if (styleTagRef.current?.parentNode) {
      styleTagRef.current.parentNode.removeChild(styleTagRef.current);
      styleTagRef.current = null;
    }
  }, [pointMarkersRef, polylinesRef, polylineVertexMarkersRef]);

  /**
   * Эффект инициализации Google Maps.
   * - Создаёт уникальный ID контейнера (если ещё нет).
   * - Загружает Google Maps API (если ещё не загружен).
   * - Создаёт google.maps.Map и подписывается на событие 'idle' — когда карта готова.
   *
   * Возвращает функцию очистки, которая вызывает cleanupMap и помечает процесс как отменённый.
   */
  useEffect(() => {
    // Берём API ключ из переменных окружения Vite
    const apiKey = (import.meta.env as any).VITE_GOOGLE_API_KEY;
    // Если нет ключа или контейнера — ничего не делаем
    if (!apiKey || !containerRef.current) return;

    // Генерируем уникальный id контейнера один раз
    if (!containerIdRef.current) {
      containerIdRef.current = `google-map-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      // Подпишем id на DOM-элемент — это нужно для локального CSS-таргетинга
      containerRef.current.id = containerIdRef.current;
    }

    let cancelled = false;

    /**
     * loadGoogleMaps — асинхронно загружает Google Maps JS API.
     * Если библиотека уже присутствует в window.google.maps — возвращает её сразу.
     */
    const loadGoogleMaps = async (): Promise<typeof google> => {
      if (window.google?.maps) return window.google;

      return new Promise<typeof google>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=geometry,places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(window.google);
        script.onerror = () => reject(new Error("Failed to load Google Maps"));
        document.head.appendChild(script);
      });
    };

    /**
     * initMap — создаёт экземпляр google.maps.Map и подписывается на событие 'idle'.
     * После события 'idle' помечает карту как готовую и вызывает onMapReady.
     */
    const initMap = async () => {
      try {
        const google = await loadGoogleMaps();
        if (cancelled || !containerRef.current) return;

        // Создаём Map с параметрами по умолчанию (центр Москва, зум 10)
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: { lat: 55.75, lng: 37.61 },
          zoom: 10,
          mapTypeId: providerId === "GoogleSatellite" ? "satellite" : "roadmap",
          disableDefaultUI: true,
        });

        // Ждём первое idle событие — карта полностью инициализирована и готова
        google.maps.event.addListenerOnce(mapRef.current, "idle", () => {
          setMapReady(true);
          onMapReady?.(mapRef.current!);
        });
      } catch (error) {
        // логируем ошибку, но не ломаем приложение
        console.error("Google Maps init failed", error);
      }
    };

    initMap();

    return () => {
      // помечаем, что инициализация отменена и чистим ресурсы
      cancelled = true;
      cleanupMap();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, providerId, cleanupMap, onMapReady]);

  // Возвращаем рефы и флаг готовности карты.
  // containerIdRef и styleTagRef возвращаем намеренно — внешний код
  // может захотеть вставлять CSS или управлять курсором через ID/стиль.
  return { mapRef, mapReady, containerIdRef, styleTagRef, clickListenerRef };
};
