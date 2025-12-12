import React, { FC, useRef } from "react";
import styles from "./YandexEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData } from "../geoDataType";
import { YandexGeoRenderer } from "./YandexGeoRenderer";
import { useYandexMapCursor } from "./hooks/useYandexMapCursor";
import { useYandexDrawHandler } from "./hooks/useYandexDrawHandler";
import { useYandexMapInit } from "./hooks/useYandexMapInit";

/**
 * Пропсы компонента YandexEngine
 */
interface YandexEngineProps {
  /** Тип карты: YandexMap | YandexSatellite | YandexHybrid */
  providerId: string;

  /** Текущий режим рисования: Point или LineString */
  drawActionType?: DrawActionType;

  /** URL иконки маркера */
  markerIconUrl?: string;

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
 * Отвечает за:
 * 1. Инициализацию карты через useYandexMapInit
 * 2. Управление режимами рисования через useYandexDrawHandler
 * 3. Управление курсором карты через useYandexMapCursor
 * 4. Рендер маркеров и линий через YandexGeoRenderer после готовности карты
 */
export const YandexEngine: FC<YandexEngineProps> = ({
  providerId,
  drawActionType,
  markerIconUrl,
  tempGeoData,
  savedGeoData,
  onUpdateGeoData,
}) => {
  /**
   * Ref контейнера карты в DOM
   * Гарантирует доступ к DOM элементу до инициализации карты
   */
  const containerRef = useRef<HTMLDivElement>(null!);

  /**
   * Ref для хранения всех маркеров по их ID
   * Позволяет управлять маркерами без пересоздания экземпляров
   */
  const markersRef = useRef<Map<string, any>>(new Map());

  /**
   * Инициализация Yandex Map
   * Возвращает:
   * - mapRef: Ref на экземпляр карты
   * - containerIdRef: Ref с уникальным ID контейнера карты
   * - mapLoaded: Флаг готовности карты к рендеру
   */
  const { mapRef, containerIdRef, mapLoaded } = useYandexMapInit(
    containerRef,
    providerId
  );

  /**
   * Подключение обработчика кликов на карте
   * - Добавляет точки или линии в tempGeoData в зависимости от drawActionType
   */
  useYandexDrawHandler(mapRef, tempGeoData, drawActionType, onUpdateGeoData);

  /**
   * Управление курсором контейнера карты
   * - Курсор "crosshair", если активен drawActionType
   * - Курсор "grab" при отсутствии режима рисования
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
