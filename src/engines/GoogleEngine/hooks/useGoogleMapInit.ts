import { useEffect, useCallback, useRef, useState, RefObject } from "react";
import { DrawActionType } from "../../drawActionType";
import { MapConfig } from "../../mapConfig";

declare global {
    interface Window {
        google: typeof google;
    }
}

/**
 * Пропсы хука useGoogleMapInit
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

/**
 * useGoogleMapInit — хук инициализации карты Google.
 *
 * Основные обязанности:
 * 1. Асинхронная загрузка Google Maps JS API, если он ещё не загружен.
 * 2. Создание экземпляра google.maps.Map в переданном контейнере.
 * 3. Управление "чисткой" карты: удаление слушателей клика, маркеров, полилиний и т.п.
 * 4. Генерация уникального id контейнера (для локального CSS, курсора и т.п.).
 *
 * @param props.containerRef - ref контейнера, в котором создаётся карта
 * @param props.providerId - идентификатор провайдера (определяет basemap)
 * @param props.pointMarkersRef - ref контейнера маркеров точек
 * @param props.polylinesRef - ref контейнера полилиний
 * @param props.polylineVertexMarkersRef - ref контейнера маркеров вершин
 * @param props.onMapReady - опциональный callback при готовности карты
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

    /** Ref на слушатель клика карты (если понадобится для удаления) */
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
        clickListenerRef.current?.remove();
        clickListenerRef.current = null;

        pointMarkersRef.current?.forEach((marker) => marker.setMap(null));
        pointMarkersRef.current?.clear();

        polylinesRef.current?.forEach((polyline) => polyline.setMap(null));
        polylinesRef.current?.clear();

        polylineVertexMarkersRef.current?.forEach((markers) =>
            markers.forEach((marker) => marker.setMap(null))
        );
        polylineVertexMarkersRef.current?.clear();

        if (styleTagRef.current?.parentNode) {
            styleTagRef.current.parentNode.removeChild(styleTagRef.current);
            styleTagRef.current = null;
        }
    }, [pointMarkersRef, polylinesRef, polylineVertexMarkersRef]);

    /**
     * Эффект инициализации Google Maps.
     * - Создаёт уникальный ID контейнера (если ещё не создан)
     * - Загружает Google Maps API
     * - Создаёт экземпляр карты и подписывается на событие 'idle'
     */
    useEffect(() => {
        const apiKey = (import.meta.env as any).VITE_GOOGLE_API_KEY;
        if (!apiKey || !containerRef.current) return;

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
                script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=geometry,places`;
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

                mapRef.current = new google.maps.Map(containerRef.current, {
                    center: { lat: mapConfig.center.lat, lng: mapConfig.center.lng },
                    zoom: mapConfig.zoom,
                    mapTypeId: providerId === "GoogleSatellite" ? "satellite" : "roadmap",
                    disableDefaultUI: true,
                });

                google.maps.event.addListenerOnce(mapRef.current, "idle", () => {
                    setMapReady(true);
                    onMapReady?.(mapRef.current!);
                });
            } catch (error) {
                console.error("Google Maps init failed", error);
            }
        };

        initMap();

        return () => {
            cancelled = true;
            cleanupMap();
        };
    }, [containerRef, providerId, cleanupMap, onMapReady]);

    return { mapRef, mapReady, containerIdRef, styleTagRef, clickListenerRef };
};
