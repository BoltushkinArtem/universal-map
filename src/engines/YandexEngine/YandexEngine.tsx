import React, { FC, useRef } from "react";
import styles from "./YandexEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData } from "../geoDataType";
import { YandexGeoRenderer } from "./YandexGeoRenderer";
import { useYandexMapCursor } from "./hooks/useYandexMapCursor";
import { useYandexDrawHandler } from "./hooks/useYandexDrawHandler";
import { useYandexMapInit } from "./hooks/useYandexMapInit";
import { MapConfig } from "../mapConfig";

/**
 * Пропсы компонента YandexEngine
 */
interface YandexEngineProps {
    /** Тип карты: YandexMap | YandexSatellite | YandexHybrid */
    providerId: string;

    /** Текущий режим рисования: Point или LineString */
    drawActionType?: DrawActionType;

    /** URL иконки маркера (по желанию) */
    markerIconUrl?: string;

    /** Конфигурация карты: центр и zoom */
    mapConfig: MapConfig;

    /** Временные геоданные для отображения */
    tempGeoData: GeoData;

    /** Сохранённые геоданные для отображения */
    savedGeoData: GeoData;

    /** Колбэк для обновления геоданных после действий пользователя */
    onUpdateGeoData: (data: GeoData) => void;
}

/**
 * YandexEngine — компонент-обёртка для Yandex Maps.
 *
 * Ответственности:
 * 1. Инициализация карты через useYandexMapInit.
 * 2. Подключение обработчика кликов для рисования точек и линий через useYandexDrawHandler.
 * 3. Управление курсором карты через useYandexMapCursor.
 * 4. Рендер маркеров и линий через YandexGeoRenderer после готовности карты.
 *
 * Компонент только координирует работу карты и DOM-контейнера.
 */
const YandexEngine: FC<YandexEngineProps> = ({
    providerId,
    drawActionType,
    markerIconUrl,
    mapConfig,
    tempGeoData,
    savedGeoData,
    onUpdateGeoData,
}) => {
    /**
     * Ref на контейнер карты в DOM.
     * Non-null assertion гарантирует, что элемент существует при инициализации карты.
     */
    const containerRef = useRef<HTMLDivElement>(null!);

    /**
     * Ref для хранения всех маркеров по их ID.
     * Позволяет управлять маркерами без пересоздания экземпляров.
     */
    const markersRef = useRef<Map<string, any>>(new Map());

    /**
     * Инициализация карты Yandex через кастомный хук.
     * Возвращает:
     * - mapRef: Ref на экземпляр карты
     * - containerIdRef: Ref с уникальным ID контейнера карты
     * - mapLoaded: Флаг готовности карты к рендеру
     */
    const { mapRef, containerIdRef, mapLoaded } = useYandexMapInit({
        containerRef,
        providerId,
        mapConfig,
    });

    /**
     * Подключение обработчика кликов на карте для режима рисования.
     * Хук отвечает за:
     * - добавление точек и линий в tempGeoData
     * - вызов колбэка onUpdateGeoData
     */
    useYandexDrawHandler(mapRef, tempGeoData, drawActionType, onUpdateGeoData);

    /**
     * Управление курсором контейнера карты:
     * - "crosshair" при активном drawActionType
     * - "grab" при отсутствии режима рисования
     */
    useYandexMapCursor(containerRef, containerIdRef, drawActionType);

    return (
        <>
            {/* Контейнер карты */}
            <div ref={containerRef} className={styles.mapContainer} />

            {/* Рендер маркеров и линий только после готовности карты */}
            {mapLoaded && mapRef.current && (
                <YandexGeoRenderer
                    map={mapRef.current}
                    tempGeoData={tempGeoData}
                    savedGeoData={savedGeoData}
                    markerIconUrl={markerIconUrl}
                    markersRef={markersRef}
                />
            )}
        </>
    );
};

export default YandexEngine;
