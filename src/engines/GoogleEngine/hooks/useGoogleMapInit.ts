import { useEffect, useCallback, useRef, useState, RefObject } from "react";
import { MapConfig } from "../../mapConfig";
import { getProviderSrc } from "../../../utils/providers";

/**
 * Тип пропсов для хука useGoogleMapInit.
 */
interface UseGoogleMapInitProps {
    /** Идентификатор провайдера карты: "GoogleSatellite" | "GoogleRoadmap" */
    providerId: string;

    /** Ref на контейнер, в котором будет создана карта Google */
    containerRef: RefObject<HTMLDivElement>;

    /** Конфигурация карты (центр и zoom) */
    mapConfig: MapConfig;

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

declare global {
    interface Window {
        google: typeof google;
    }
}

/**
 * useGoogleMapInit — хук инициализации Google Maps.
 *
 * Основные обязанности:
 * 1. Асинхронная загрузка Google Maps JS API, если он ещё не загружен.
 * 2. Создание экземпляра google.maps.Map в переданном контейнере.
 * 3. Управление очисткой карты: удаление слушателей клика, маркеров, полилиний и т.п.
 * 4. Генерация уникального id контейнера (для локального CSS, курсора и т.п.).
 *
 * @param props - объект пропсов
 * @returns mapRef, mapReady, containerIdRef, styleTagRef, clickListenerRef
 */
export const useGoogleMapInit = ({
    providerId,
    containerRef,
    mapConfig,
    pointMarkersRef,
    polylinesRef,
    polylineVertexMarkersRef,
    onMapReady,
}: UseGoogleMapInitProps) => {
    /** Ref на экземпляр google.maps.Map */
    const mapRef = useRef<google.maps.Map | null>(null);

    /** Ref на динамически созданный <style> для локальных стилей контейнера */
    const styleTagRef = useRef<HTMLStyleElement | null>(null);

    /** Уникальный ID контейнера для локальных CSS-селекторов */
    const containerIdRef = useRef<string>("");

    /** Флаг готовности карты (true после события 'idle') */
    const [mapReady, setMapReady] = useState<boolean>(false);

    /** Ref на слушатель клика карты (для возможного удаления) */
    const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

    /**
     * Очистка карты от созданных объектов и слушателей.
     * Удаляет:
     * - слушатель клика,
     * - все маркеры точек,
     * - все полилинии,
     * - маркеры вершин,
     * - динамически созданный <style>.
     */
    const cleanupMap = useCallback(() => {
        // Удаляем слушатель клика, если он был
        clickListenerRef.current?.remove();
        clickListenerRef.current = null;

        // Удаляем маркеры точек с карты и очищаем Map
        pointMarkersRef.current?.forEach((marker) => marker.setMap(null));
        pointMarkersRef.current?.clear();

        // Удаляем все полилинии с карты и очищаем Map
        polylinesRef.current?.forEach((polyline) => polyline.setMap(null));
        polylinesRef.current?.clear();

        // Удаляем маркеры вершин полилиний и очищаем Map
        polylineVertexMarkersRef.current?.forEach((markers) =>
            markers.forEach((marker) => marker.setMap(null))
        );
        polylineVertexMarkersRef.current?.clear();

        // Удаляем динамический <style> из DOM
        if (styleTagRef.current?.parentNode) {
            styleTagRef.current.parentNode.removeChild(styleTagRef.current);
            styleTagRef.current = null;
        }
    }, [pointMarkersRef, polylinesRef, polylineVertexMarkersRef]);

    /**
     * Эффект инициализации Google Maps:
     * - Создаёт уникальный ID контейнера (если ещё не создан)
     * - Загружает Google Maps API
     * - Создаёт экземпляр карты и подписывается на событие 'idle'
     */
    useEffect(() => {
        const src = getProviderSrc(providerId);
        if (!src?.length || !containerRef.current) return;

        // Генерация уникального ID для контейнера
        if (!containerIdRef.current) {
            containerIdRef.current = `google-map-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`;
            containerRef.current.id = containerIdRef.current;
        }

        let cancelled = false;

        /**
         * Асинхронная загрузка Google Maps JS API
         */
        const loadGoogleMaps = async (): Promise<typeof google> => {
            if (window.google?.maps) return window.google;

            return new Promise<typeof google>((resolve, reject) => {
                const script = document.createElement("script");
                script.src = src;
                script.async = true;
                script.defer = true;
                script.onload = () => resolve(window.google);
                script.onerror = () => reject(new Error("Failed to load Google Maps"));
                document.head.appendChild(script);
            });
        };

        /**
         * Инициализация карты Google
         */
        const initMap = async () => {
            try {
                const google = await loadGoogleMaps();
                if (cancelled || !containerRef.current) return;

                // Создание карты Google
                mapRef.current = new google.maps.Map(containerRef.current, {
                    center: { lat: mapConfig.center.lat, lng: mapConfig.center.lng },
                    zoom: mapConfig.zoom,
                    mapTypeId: providerId === "GoogleSatellite" ? "satellite" : "roadmap",
                    disableDefaultUI: true,
                });

                // Событие 'idle' — карта полностью готова к использованию
                google.maps.event.addListenerOnce(mapRef.current, "idle", () => {
                    setMapReady(true);
                    onMapReady?.(mapRef.current!);
                });
            } catch (error) {
                console.error("Google Maps init failed", error);
            }
        };

        initMap();

        // Очистка при размонтировании или изменении зависимостей
        return () => {
            cancelled = true;
            cleanupMap();
        };
    }, [containerRef, providerId, mapConfig, cleanupMap, onMapReady]);

    // Возвращаем ref'ы и состояние готовности карты
    return { mapRef, mapReady, containerIdRef, styleTagRef, clickListenerRef };
};
