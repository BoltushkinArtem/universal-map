import { useEffect, useCallback } from "react";
import { DrawActionType } from "../../drawActionType";
import { GeoData } from "../../geoDataType";
import { normalizeGeoData } from "../../../utils/geoDataNormalizer";
import { updateGeoData } from "../../../utils/updateGeoData";

/**
 * Пропсы хука useArcGISDrawHandler
 */
interface UseArcGISDrawHandlerProps {
  /** Ref на MapView ArcGIS */
  viewRef: React.RefObject<__esri.MapView | null>;

  /** Текущий режим рисования (Point или LineString) */
  drawActionType?: DrawActionType;

  /** Временные геоданные для обновления при рисовании */
  tempGeoData: GeoData;

  /** Колбэк для обновления геоданных */
  onUpdateGeoData: (data: GeoData) => void;
}

/**
 * useArcGISDrawHandler — хук для обработки кликов на ArcGIS карте в режиме рисования
 * - Добавляет точки или линии в GeoData
 * - Сохраняет обновлённые данные через onUpdateGeoData
 *
 * @param props.viewRef - Ref на MapView ArcGIS
 * @param props.drawActionType - Текущий режим рисования
 * @param props.tempGeoData - Временные геоданные
 * @param props.onUpdateGeoData - Колбэк для обновления геоданных
 */
export const useArcGISDrawHandler = ({
  viewRef,
  drawActionType,
  tempGeoData,
  onUpdateGeoData,
}: UseArcGISDrawHandlerProps) => {
  /**
   * Обработчик клика по карте
   * - Создаёт координаты из места клика
   * - Обновляет GeoData в зависимости от режима рисования
   *
   * @param e - объект события ViewClickEvent от ArcGIS
   */
  const handleMapClick = useCallback(
    (e: __esri.ViewClickEvent) => {
      if (!drawActionType) return;

      // Получаем координаты клика [долгота, широта]
      const coord: [number, number] = [e.mapPoint.longitude, e.mapPoint.latitude];

      // Обновляем GeoData через normalize -> update
      const updatedGeoData = updateGeoData(
        normalizeGeoData(tempGeoData),
        coord,
        drawActionType
      );

      onUpdateGeoData(updatedGeoData);
    },
    [drawActionType, tempGeoData, onUpdateGeoData]
  );

  /**
   * Эффект подписки на клики карты
   * - Подключается только если есть viewRef и drawActionType
   * - Отписывается при размонтировании или изменении зависимостей
   */
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !drawActionType) return;

    // Подписка на событие клика
    const handler = view.on("click", handleMapClick);

    // Очистка при размонтировании
    return () => {
      handler.remove();
    };
  }, [viewRef, handleMapClick, drawActionType]);
};
