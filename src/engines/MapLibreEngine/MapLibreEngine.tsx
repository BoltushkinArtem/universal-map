import { FC, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./MapLibreEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData } from "../geoDataType";
import { MapLibreGeoRenderer } from "./MapLibreGeoRenderer";
import { useMapLibreMapInit } from "./hooks/useMapLibreMapInit";
import { useMapLibreDrawHandler } from "./hooks/useMapLibreDrawHandler";
import { useMapLibreMapCursor } from "./hooks/useMapLibreMapCursor";

/**
 * Пропсы компонента MapLibreEngine
 */
interface MapLibreEngineProps {
  /** Идентификатор провайдера для подгрузки тайлов */
  providerId: string;
  /** Тип действия рисования (маркер или полилиния) */
  drawActionType?: DrawActionType;
  /** URL иконки для отображения точечных маркеров */
  markerIconUrl?: string;
  /** Временные геоданные пользователя */
  tempGeoData: GeoData;
  /** Сохраненные геоданные (опционально) */
  savedGeoData?: GeoData;
  /** Callback для обновления геоданных при добавлении маркеров или линий */
  onUpdateGeoData: (data: GeoData) => void;
}

/**
 * MapLibreEngine — компонент для отображения карты MapLibre с поддержкой:
 * - Добавления маркеров
 * - Рисования полилиний
 * - Рендеринга вершин линий и маркеров через MapLibreGeoRenderer
 *
 * Логика:
 * 1. Инициализация карты через useMapLibreMapInit.
 * 2. Обработка кликов по карте и обновление GeoData через useMapLibreDrawHandler.
 * 3. Управление стилем курсора карты через useMapCursor.
 * 4. Рендеринг GeoData (маркеры, линии) через MapLibreGeoRenderer после готовности карты.
 */
const MapLibreEngine: FC<MapLibreEngineProps> = ({
  providerId,
  drawActionType,
  markerIconUrl,
  tempGeoData,
  savedGeoData,
  onUpdateGeoData,
}) => {
  /**
   * Ref на контейнер карты в DOM.
   * Используется для инициализации экземпляра MapLibre.
   */
  const mapContainerRef = useRef<HTMLDivElement>(null!);

  /**
   * Ref для хранения всех точечных маркеров по их ID.
   * Позволяет обновлять позиции маркеров без пересоздания.
   */
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  /**
   * Инициализация карты MapLibre.
   * mapRef — Ref на экземпляр карты, mapReady — флаг готовности карты.
   */
  const { mapRef, mapReady } = useMapLibreMapInit({
    containerRef: mapContainerRef,
    providerId,
  });

  /**
   * Хук для обработки кликов по карте.
   * Обновляет временные геоданные tempGeoData в зависимости от drawActionType.
   */
  useMapLibreDrawHandler({
    mapRef,
    drawActionType,
    tempGeoData,
    onUpdateGeoData,
  });

  /**
   * Управление стилем курсора карты:
   * - crosshair при активном drawActionType
   * - default при отсутствии действия рисования
   */
  useMapLibreMapCursor(mapRef, drawActionType, mapReady);

  return (
    <>
      {/* Контейнер карты */}
      <div ref={mapContainerRef} className={styles.mapInner} />

      {/* Рендеринг GeoData (маркеры, линии) только после готовности карты */}
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
