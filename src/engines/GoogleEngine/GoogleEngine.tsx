import React, { FC, useRef } from "react";
import styles from "./GoogleEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData } from "../geoDataType";
import { GoogleGeoRenderer } from "./GoogleGeoRenderer";
import { useGoogleMapInit } from "./hooks/useGoogleMapInit";
import { useGoogleDrawHandler } from "./hooks/useGoogleDrawHandler";
import { useMapCursor } from "./hooks/useMapCursor";

/**
 * Props компонента GoogleEngine
 */
interface GoogleEngineProps {
  /** Идентификатор провайдера карты (например, "GoogleSatellite" или "GoogleRoadmap") */
  providerId: string;
  /** Текущий режим рисования (Point | LineString) */
  drawActionType?: DrawActionType;
  /** URL иконки маркера (опционально) */
  markerIconUrl?: string;
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
 * Ответственности:
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
  tempGeoData,
  savedGeoData,
  onUpdateGeoData,
}) => {
  /**
   * DOM-элемент, в который будет монтироваться карта.
   * Используем non-null assertion, потому что элемент гарантированно будет присутствовать в DOM
   * до инициализации карты (контейнер рендерится самим компонентом).
   */
  const containerRef = useRef<HTMLDivElement>(null!);

  /**
   * Коллекции (refs) объектов карты, передаём их в хук и в рендерер:
   * - pointMarkersRef: маркеры точек (id -> Marker)
   * - polylinesRef: полилинии (id -> Polyline)
   * - polylineVertexMarkersRef: маркеры вершин для полилиний (id -> Marker[])
   *
   * Храним их здесь как refs, чтобы доступ оставался стабильным между рендерами.
   */
  const pointMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
  const polylineVertexMarkersRef = useRef<Map<string, google.maps.Marker[]>>(new Map());

  /**
   * Инициализация карты через хук.
   * Хук отвечает за:
   * - загрузку Google Maps API,
   * - создание google.maps.Map,
   * - генерацию containerIdRef и styleTagRef (если требуется),
   * - очистку карты при размонтировании.
   *
   * Возвращает:
   * - mapRef: Ref на google.maps.Map
   * - mapReady: boolean — карта инициализирована и готова
   * - containerIdRef: Ref со строковым id контейнера (используется для локальных CSS-правил)
   * - styleTagRef: Ref на динамический <style> (если понадобится управление стилями)
   */
  const { mapRef, mapReady, containerIdRef, styleTagRef } = useGoogleMapInit({
    containerRef,
    providerId,
    pointMarkersRef,
    polylinesRef,
    polylineVertexMarkersRef,
  });

  /**
   * Подключаем обработчик кликов на карте для режима рисования.
   * Хук useGoogleDrawHandler подписывается на события на mapRef и вызывает onUpdateGeoData.
   */
  useGoogleDrawHandler({
    mapRef,
    drawActionType,
    tempGeoData,
    onUpdateGeoData,
  });

  /**
   * Управление курсором карты:
   * - Если drawActionType задан — курсор "crosshair"
   * - Если drawActionType отсутствует — курсор "grab"
   * Хук использует containerIdRef и styleTagRef для локального CSS.
   */
  useMapCursor(containerIdRef, styleTagRef, drawActionType);

  return (
    <>
      {/* Контейнер, в который хук поместит google.maps.Map */}
      <div ref={containerRef} className={styles.googleContainer} />

      {/* После готовности карты рендерим GoogleGeoRenderer (он синхронизирует маркеры/линии) */}
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
