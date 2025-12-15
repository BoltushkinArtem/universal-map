import { FC, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./MapLibreEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData } from "../geoDataType";
import { MapLibreGeoRenderer } from "./MapLibreGeoRenderer";
import { useMapLibreMapInit } from "./hooks/useMapLibreMapInit";
import { useMapLibreDrawHandler } from "./hooks/useMapLibreDrawHandler";
import { useMapLibreMapCursor } from "./hooks/useMapLibreMapCursor";
import { MapConfig } from "../mapConfig";

/**
 * Пропсы компонента MapLibreEngine
 */
interface MapLibreEngineProps {
    /** Идентификатор провайдера для подгрузки тайлов */
    providerId: string;

    /** Тип действия рисования (Point | LineString) */
    drawActionType?: DrawActionType;

    /** URL иконки маркера (по желанию) */
    markerIconUrl?: string;

    /** Конфигурация карты (центр и zoom) */
    mapConfig: MapConfig;

    /** Временные геоданные пользователя */
    tempGeoData: GeoData;

    /** Сохранённые геоданные (по желанию) */
    savedGeoData?: GeoData;

    /** Колбэк для обновления геоданных при добавлении маркеров или линий */
    onUpdateGeoData: (data: GeoData) => void;
}

/**
 * MapLibreEngine — компонент-обёртка для MapLibre.
 *
 * Ответственности:
 * 1. Инициализация карты через useMapLibreMapInit.
 * 2. Подписка на клики по карте и обновление tempGeoData через useMapLibreDrawHandler.
 * 3. Управление курсором контейнера карты через useMapLibreMapCursor.
 * 4. Рендер GeoData (маркеры и линии) через MapLibreGeoRenderer после готовности карты.
 *
 * ВАЖНО: логика рендеринга и кликов вынесена в хуки и MapLibreGeoRenderer.
 */
const MapLibreEngine: FC<MapLibreEngineProps> = ({
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
     * Non-null assertion используется, т.к. элемент гарантированно будет смонтирован.
     */
    const mapContainerRef = useRef<HTMLDivElement>(null!);

    /**
     * Ref для хранения всех точечных маркеров по их ID.
     * Позволяет обновлять позиции маркеров без пересоздания.
     */
    const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

    /**
     * Инициализация карты MapLibre через хук.
     * Возвращает:
     * - mapRef: Ref на экземпляр карты maplibregl.Map
     * - mapReady: флаг готовности карты
     */
    const { mapRef, mapReady } = useMapLibreMapInit({
        containerRef: mapContainerRef,
        providerId,
        mapConfig,
    });

    /**
     * Подписка на клики карты для добавления маркеров или линий.
     * useMapLibreDrawHandler обновляет tempGeoData через onUpdateGeoData.
     */
    useMapLibreDrawHandler({
        mapRef,
        drawActionType,
        tempGeoData,
        onUpdateGeoData,
    });

    /**
     * Управление стилем курсора карты:
     * - "crosshair" при активном drawActionType
     * - "default" если drawActionType отсутствует
     */
    useMapLibreMapCursor(mapRef, drawActionType, mapReady);

    return (
        <>
            {/* Контейнер для MapLibre */}
            <div ref={mapContainerRef} className={styles.mapInner} />

            {/* Рендер геоданных только после готовности карты */}
            {mapReady && mapRef.current && (
                <MapLibreGeoRenderer
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

export default MapLibreEngine;
