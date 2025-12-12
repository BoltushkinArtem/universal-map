import React, { FC, useRef, useEffect } from "react";
import styles from "./ArcGISEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData } from "../geoDataType";
import { ArcGISGeoRenderer } from "./ArcGISGeoRenderer";
import { useArcGISMapInit } from "./hooks/useArcGISMapInit";
import { useArcGISDrawHandler } from "./hooks/useArcGISDrawHandler";

/**
 * Пропсы компонента ArcGISEngine
 */
interface ArcGISEngineProps {
  /** Идентификатор провайдера карты ArcGIS */
  providerId: string;

  /** Текущий режим рисования: Point или LineString */
  drawActionType?: DrawActionType;

  /** URL иконки маркера (по желанию) */
  markerIconUrl?: string;

  /** Временные геоданные для отрисовки */
  tempGeoData: GeoData;

  /** Сохранённые геоданные (по желанию) */
  savedGeoData?: GeoData;

  /** Колбэк для обновления геоданных */
  onUpdateGeoData: (data: GeoData) => void;
}

/**
 * ArcGISEngine — компонент, который инициализирует карту ArcGIS,
 * управляет режимами рисования и рендерит фичи через ArcGISGeoRenderer.
 *
 * Логика:
 * 1. Инициализация карты и слоя графики через useArcGISMapInit.
 * 2. Управление курсором в зависимости от drawActionType.
 * 3. Подписка на клики для добавления точек или линий через useArcGISDrawHandler.
 * 4. Рендер графики через ArcGISGeoRenderer.
 */
const ArcGISEngine: FC<ArcGISEngineProps> = ({
  providerId,
  drawActionType,
  markerIconUrl,
  tempGeoData,
  savedGeoData,
  onUpdateGeoData,
}) => {
  /** Ref контейнера карты */
  const containerRef = useRef<HTMLDivElement>(null!);

  /** Инициализация карты, слоя графики и загрузка модулей ArcGIS */
  const { viewRef, graphicsLayerRef, esriModulesRef, mapReady } = useArcGISMapInit({
    providerId,
    containerRef,
  });

  /**
   * Управление курсором контейнера карты
   * - Курсор "crosshair", если активен режим рисования
   * - Курсор "grab" в обычном режиме
   */
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.style.cursor = drawActionType ? "crosshair" : "grab";
  }, [drawActionType]);

  /**
   * Подписка на клики карты для режима рисования
   * - Использует хук useArcGISDrawHandler
   * - Добавляет точки или линии в GeoData
   */
  useArcGISDrawHandler({
    viewRef,
    drawActionType,
    tempGeoData,
    onUpdateGeoData,
  });

  return (
    <>
      {/* Контейнер карты */}
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
