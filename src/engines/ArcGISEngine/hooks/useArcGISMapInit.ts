import { useEffect, useRef, useState } from "react";
import { MapConfig } from "../../mapConfig";

/**
 * Интерфейс загруженных модулей ArcGIS API.
 * Используется для хранения ссылок на классы API после динамической загрузки.
 */
interface EsriModules {
    /** Класс графики для точек и линий */
    Graphic?: typeof __esri.Graphic;

    /** Класс точки */
    Point?: typeof __esri.Point;

    /** Класс линии */
    Polyline?: typeof __esri.Polyline;

    /** Символ маркера (иконка) */
    PictureMarkerSymbol?: typeof __esri.PictureMarkerSymbol;

    /** Символ линии */
    SimpleLineSymbol?: typeof __esri.SimpleLineSymbol;
}

/**
 * Пропсы для хука useArcGISMapInit
 */
interface UseArcGISMapInitProps {
    /** Идентификатор провайдера ArcGIS для выбора базовой карты */
    providerId: string;

    /** Ref контейнера карты, в котором будет создан MapView */
    containerRef: React.RefObject<HTMLDivElement>;

    /** Конфигурация карты (центр и zoom) */
    mapConfig: MapConfig;
}

/**
 * useArcGISMapInit — хук инициализации карты ArcGIS.
 *
 * Основные функции:
 * 1. Загружает ArcGIS API при необходимости (CSS и JS).
 * 2. Создаёт MapView и GraphicsLayer.
 * 3. Подгружает необходимые модули ArcGIS.
 * 4. Возвращает рефы и флаг готовности карты.
 *
 * @param props.providerId - идентификатор провайдера карты
 * @param props.containerRef - ref контейнера для карты
 * @param props.mapConfig - конфигурация карты
 * @returns {object} { viewRef, graphicsLayerRef, esriModulesRef, mapReady }
 */
export const useArcGISMapInit = ({
    providerId,
    containerRef,
    mapConfig,
}: UseArcGISMapInitProps) => {
    /** Ref на экземпляр MapView ArcGIS */
    const viewRef = useRef<__esri.MapView | null>(null);

    /** Ref на слой графики ArcGIS */
    const graphicsLayerRef = useRef<__esri.GraphicsLayer | null>(null);

    /** Ref на загруженные модули ArcGIS API */
    const esriModulesRef = useRef<EsriModules>({});

    /** Состояние готовности карты к взаимодействию */
    const [mapReady, setMapReady] = useState(false);

    /**
     * Эффект инициализации карты
     * - Загружает CSS и JS ArcGIS API если ещё не загружен
     * - Создаёт MapView и GraphicsLayer
     * - Сохраняет ссылки на загруженные модули
     */
    useEffect(() => {
        /** Флаг отмены инициализации при размонтировании */
        let cancelled = false;

        /**
         * Функция инициализации карты
         */
        const init = async () => {
            // Если ArcGIS API ещё не загружен
            if (!(window as any).require) {
                // Подключение CSS
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = "https://js.arcgis.com/4.26/esri/themes/light/main.css";
                document.head.appendChild(link);

                // Подключение JS
                const script = document.createElement("script");
                script.src = "https://js.arcgis.com/4.26/";
                document.body.appendChild(script);
                await new Promise<void>((resolve) => (script.onload = () => resolve()));
            }

            // Подключение модулей ArcGIS через require
            (window as any).require(
                [
                    "esri/Map",
                    "esri/views/MapView",
                    "esri/layers/GraphicsLayer",
                    "esri/Graphic",
                    "esri/geometry/Point",
                    "esri/geometry/Polyline",
                    "esri/symbols/PictureMarkerSymbol",
                    "esri/symbols/SimpleLineSymbol",
                ],
                (
                    Map: any,
                    MapView: any,
                    GraphicsLayer: any,
                    Graphic: any,
                    Point: any,
                    Polyline: any,
                    PictureMarkerSymbol: any,
                    SimpleLineSymbol: any
                ) => {
                    // Если контейнер отсутствует или эффект отменён, прекращаем
                    if (!containerRef.current || cancelled) return;

                    // Создание карты с выбором базовой карты в зависимости от провайдера
                    const map = new Map({
                        basemap: providerId === "MapLibre_ArcGISAero" ? "satellite" : "streets-vector",
                    });

                    // Создание MapView
                    const view = new MapView({
                        container: containerRef.current,
                        map,
                        center: [mapConfig.center.lng, mapConfig.center.lat], // Координаты центра карты
                        zoom: mapConfig.zoom, // Масштаб по умолчанию
                    });

                    // Создание слоя графики
                    const graphicsLayer = new GraphicsLayer();
                    map.add(graphicsLayer);

                    // Сохраняем рефы для использования в других компонентах или хуках
                    viewRef.current = view;
                    graphicsLayerRef.current = graphicsLayer;

                    // Сохраняем загруженные модули ArcGIS
                    esriModulesRef.current = {
                        Graphic,
                        Point,
                        Polyline,
                        PictureMarkerSymbol,
                        SimpleLineSymbol,
                    };

                    // Устанавливаем флаг готовности карты после полной загрузки View
                    view.when(() => !cancelled && setMapReady(true));
                }
            );
        };

        // Запуск инициализации карты
        init();

        // Очистка при размонтировании компонента
        return () => {
            cancelled = true;
            viewRef.current?.destroy();
        };
    }, [providerId, containerRef, mapConfig]);

    // Возвращаем все нужные рефы и флаг готовности карты
    return {
        viewRef,
        graphicsLayerRef,
        esriModulesRef,
        mapReady,
    };
};
