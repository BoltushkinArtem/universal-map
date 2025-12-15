import React, { FC, useRef } from "react";
import styles from "./ArcGISEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData } from "../geoDataType";
import { ArcGISGeoRenderer } from "./ArcGISGeoRenderer";
import { useArcGISMapInit } from "./hooks/useArcGISMapInit";
import { useArcGISDrawHandler } from "./hooks/useArcGISDrawHandler";
import { useArcGISMapCursor } from "./hooks/useArcGISMapCursor";
import { MapConfig } from "../mapConfig";

/**
 * Пропсы компонента ArcGISEngine
 */
interface ArcGISEngineProps {
    /** Идентификатор провайдера карты ArcGIS */
    providerId: string;

    /** Текущий режим рисования: Point или LineString */
    drawActionType?: DrawActionType;

    /** URL иконки маркера (необязательный) */
    markerIconUrl?: string;

    /** Конфигурация карты (центр и zoom) */
    mapConfig: MapConfig;

    /** Временные геоданные для отрисовки */
    tempGeoData: GeoData;

    /** Сохранённые геоданные (необязательные) */
    savedGeoData?: GeoData;

    /** Колбэк для обновления геоданных */
    onUpdateGeoData: (data: GeoData) => void;
}

/**
 * ArcGISEngine — компонент-обёртка для карты ArcGIS.
 *
 * Основные функции:
 * 1. Инициализация карты ArcGIS и слоя графики через useArcGISMapInit.
 * 2. Управление стилем курсора контейнера карты через useArcGISMapCursor.
 * 3. Подписка на клики для добавления точек или линий через useArcGISDrawHandler.
 * 4. Делегирование рендера графики (точки, линии) в ArcGISGeoRenderer.
 *
 * Компонент отвечает только за координацию и управление DOM-контейнером.
 * Логика рендеринга и обработки кликов вынесена в хуки и ArcGISGeoRenderer.
 */
const ArcGISEngine: FC<ArcGISEngineProps> = ({
    providerId,
    drawActionType,
    markerIconUrl,
    mapConfig,
    tempGeoData,
    savedGeoData,
    onUpdateGeoData,
}) => {
    /**
     * Ref на DOM-элемент контейнера карты.
     * Non-null assertion используется, так как контейнер гарантированно будет смонтирован до инициализации карты.
     */
    const containerRef = useRef<HTMLDivElement>(null!);

    /**
     * Инициализация карты и слоя графики.
     * Хук useArcGISMapInit возвращает:
     * - viewRef: Ref на экземпляр ArcGIS MapView
     * - graphicsLayerRef: Ref на слой графики для точек и линий
     * - esriModulesRef: Ref на загруженные модули ArcGIS API
     * - mapReady: флаг готовности карты к взаимодействию
     */
    const { viewRef, graphicsLayerRef, esriModulesRef, mapReady } = useArcGISMapInit({
        providerId,
        containerRef,
        mapConfig,
    });

    /**
     * Управление стилем курсора контейнера карты.
     * - Курсор "crosshair" при активном режиме рисования.
     * - Курсор "grab" в обычном режиме.
     * Вынос в отдельный хук повышает читаемость и повторное использование.
     */
    useArcGISMapCursor(containerRef, drawActionType);

    /**
     * Подписка на клики карты для добавления точек или линий.
     * useArcGISDrawHandler:
     * - Обрабатывает клики пользователя по карте.
     * - Обновляет tempGeoData через onUpdateGeoData.
     */
    useArcGISDrawHandler({
        viewRef,
        drawActionType,
        tempGeoData,
        onUpdateGeoData,
    });

    return (
        <>
            {/* Контейнер для карты ArcGIS */}
            <div ref={containerRef} className={styles.arcgisContainer} />

            {/* Рендер графики: точки и линии */}
            <ArcGISGeoRenderer
                mapReady={mapReady}
                graphicsLayer={graphicsLayerRef.current}
                esriModules={esriModulesRef.current}
                tempGeoData={tempGeoData}
                savedGeoData={savedGeoData}
                markerIconUrl={markerIconUrl}
            />
        </>
    );
};

export default ArcGISEngine;
