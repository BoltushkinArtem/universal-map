import React, { FC, useRef } from "react";
import styles from "./GoogleEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData } from "../geoDataType";
import { GoogleGeoRenderer } from "./GoogleGeoRenderer";
import { useGoogleMapInit } from "./hooks/useGoogleMapInit";
import { useGoogleDrawHandler } from "./hooks/useGoogleDrawHandler";
import { useGoogleMapCursor } from "./hooks/useGoogleMapCursor";
import { MapConfig } from "../mapConfig";

/**
 * Пропсы компонента GoogleEngine
 */
interface GoogleEngineProps {
    /** Идентификатор провайдера карты (например, "GoogleSatellite" или "GoogleRoadmap") */
    providerId: string;

    /** Текущий режим рисования (Point | LineString) */
    drawActionType?: DrawActionType;

    /** URL иконки маркера (необязательный) */
    markerIconUrl?: string;

    /** Конфигурация карты (центр и zoom) */
    mapConfig: MapConfig;

    /** Временные геоданные для рендеринга */
    tempGeoData: GeoData;

    /** Сохранённые геоданные для рендеринга */
    savedGeoData: GeoData;

    /** Колбэк для обновления геоданных после действий пользователя */
    onUpdateGeoData: (data: GeoData) => void;
}

/**
 * GoogleEngine — компонент-обёртка для Google Maps.
 *
 * Основные функции:
 * 1. Подготавливает DOM-контейнер карты.
 * 2. Инициализирует карту через useGoogleMapInit (загрузка API и создание map).
 * 3. Подписывается на клики для режима рисования через useGoogleDrawHandler.
 * 4. Управляет курсором контейнера в зависимости от режима рисования.
 * 5. Делегирует рендер геоданных (точки/линии) в GoogleGeoRenderer.
 *
 * ВАЖНО: логика рендеринга и обработки кликов вынесена в хуки/рендерер — в этом компоненте
 * только координация и управление DOM-контейнером.
 */
const GoogleEngine: FC<GoogleEngineProps> = ({
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
     * Non-null assertion используется, так как контейнер гарантированно будет присутствовать в DOM
     * до инициализации карты.
     */
    const containerRef = useRef<HTMLDivElement>(null!);

    /**
     * Коллекции объектов карты (refs) для стабильного доступа между рендерами:
     * - pointMarkersRef: маркеры точек (id -> Marker)
     * - polylinesRef: полилинии (id -> Polyline)
     * - polylineVertexMarkersRef: маркеры вершин полилиний (id -> Marker[])
     */
    const pointMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
    const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
    const polylineVertexMarkersRef = useRef<Map<string, google.maps.Marker[]>>(new Map());

    /**
     * Инициализация карты через кастомный хук useGoogleMapInit.
     * Хук отвечает за:
     * - загрузку Google Maps API
     * - создание google.maps.Map
     * - генерацию containerIdRef и styleTagRef (для локального CSS)
     * - очистку карты при размонтировании
     *
     * Возвращает:
     * - mapRef: Ref на google.maps.Map
     * - mapReady: boolean — карта инициализирована и готова
     * - containerIdRef: Ref со строковым id контейнера
     * - styleTagRef: Ref на динамический <style>
     */
    const { mapRef, mapReady, containerIdRef, styleTagRef } = useGoogleMapInit({
        providerId,
        containerRef,
        mapConfig,
        pointMarkersRef,
        polylinesRef,
        polylineVertexMarkersRef,
    });

    /**
     * Обработчик кликов карты для режима рисования.
     * Хук useGoogleDrawHandler подписывается на события на mapRef и вызывает onUpdateGeoData.
     */
    useGoogleDrawHandler({
        mapRef,
        drawActionType,
        tempGeoData,
        onUpdateGeoData,
    });

    /**
     * Управление курсором контейнера карты:
     * - drawActionType задан — курсор "crosshair"
     * - drawActionType отсутствует — курсор "grab"
     * Использует containerIdRef и styleTagRef для локального CSS.
     */
    useGoogleMapCursor(containerIdRef, styleTagRef, drawActionType);

    return (
        <>
            {/* Контейнер, в который хук помещает google.maps.Map */}
            <div ref={containerRef} className={styles.googleContainer} />

            {/* После готовности карты рендерим GoogleGeoRenderer (синхронизация маркеров/полилиний) */}
            {mapReady && mapRef.current && (
                <GoogleGeoRenderer
                    map={mapRef.current}
                    tempGeoData={tempGeoData}
                    savedGeoData={savedGeoData}
                    markerIconUrl={markerIconUrl}
                    pointMarkersRef={pointMarkersRef}
                    polylinesRef={polylinesRef}
                    polylineVertexMarkersRef={polylineVertexMarkersRef}
                />
            )}
        </>
    );
};

export default GoogleEngine;
