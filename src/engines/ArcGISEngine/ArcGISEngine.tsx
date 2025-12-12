import React, { FC, useRef } from "react";
import styles from "./ArcGISEngine.module.scss";
import { DrawActionType } from "../drawActionType";
import { GeoData } from "../geoDataType";
import { ArcGISGeoRenderer } from "./ArcGISGeoRenderer";
import { useArcGISMapInit } from "./hooks/useArcGISMapInit";
import { useArcGISDrawHandler } from "./hooks/useArcGISDrawHandler";
import { useArcGISMapCursor } from "./hooks/useArcGISMapCursor";

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
 * ArcGISEngine — компонент, который:
 * 1. Инициализирует карту ArcGIS и слой графики через useArcGISMapInit.
 * 2. Управляет стилем курсора контейнера через useArcGISMapCursor.
 * 3. Подписывается на клики для добавления точек или линий через useArcGISDrawHandler.
 * 4. Делегирует рендер графики (точки, линии) в ArcGISGeoRenderer.
 *
 * Компонент отвечает только за координацию и управление DOM-контейнером.
 * Логика рендеринга и обработки кликов вынесена в хуки и ArcGISGeoRenderer.
 */
const ArcGISEngine: FC<ArcGISEngineProps> = ({
  providerId,
  drawActionType,
  markerIconUrl,
  tempGeoData,
  savedGeoData,
  onUpdateGeoData,
}) => {
  /**
   * Ref на DOM-элемент контейнера карты.
   * Non-null assertion используется, т.к. элемент гарантированно будет смонтирован до инициализации карты.
   */
  const containerRef = useRef<HTMLDivElement>(null!);

  /**
   * Инициализация карты, слоя графики и загрузка необходимых модулей ArcGIS.
   * viewRef — Ref на экземпляр ArcGIS MapView.
   * graphicsLayerRef — Ref на слой графики для рендеринга точек и линий.
   * esriModulesRef — Ref на загруженные модули ArcGIS API.
   * mapReady — флаг готовности карты.
   */
  const { viewRef, graphicsLayerRef, esriModulesRef, mapReady } = useArcGISMapInit({
    providerId,
    containerRef,
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
