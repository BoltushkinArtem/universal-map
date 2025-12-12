import { useEffect, useCallback, useRef } from "react";
import { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { DrawActionType } from "../../drawActionType";
import { GeoData } from "../../geoDataType";
import { updateGeoData } from "../../../utils/updateGeoData";
import { normalizeGeoData } from "../../../utils/geoDataNormalizer";

/**
 * Props для хука useMapLibreDrawHandler
 */
interface UseMapLibreDrawHandlerProps {
  /** Ref на экземпляр карты MapLibre */
  mapRef: React.RefObject<MapLibreMap | null>;
  /** Текущий тип действия рисования (MARKER, POLYLINE или undefined) */
  drawActionType?: DrawActionType;
  /** Временные геоданные пользователя */
  tempGeoData: GeoData;
  /** Callback для обновления геоданных после клика на карту */
  onUpdateGeoData: (data: GeoData) => void;
}

/**
 * Хук для обработки кликов на карте MapLibre с учетом текущего действия рисования.
 *
 * Логика:
 * - Подписка на клик по карте.
 * - В зависимости от drawActionType добавляет маркер или обновляет полилинию.
 * - drawActionRef используется для хранения актуального значения drawActionType
 *   между рендерами без необходимости подписываться на него напрямую в callback.
 *
 * @param props - свойства хука
 */
export const useMapLibreDrawHandler = ({
  mapRef,
  drawActionType,
  tempGeoData,
  onUpdateGeoData,
}: UseMapLibreDrawHandlerProps): void => {
  /**
   * Ref для хранения актуального drawActionType между рендерами.
   * Позволяет handleMapClick всегда использовать последнее значение drawActionType.
   */
  const drawActionRef = useRef<DrawActionType | undefined>(drawActionType);

  /**
   * Синхронизация drawActionRef с актуальным drawActionType.
   */
  useEffect(() => {
    drawActionRef.current = drawActionType;
  }, [drawActionType]);

  /**
   * Callback обработки клика на карте
   *
   * @param event - объект события MapMouseEvent, содержащий координаты клика
   */
  const handleMapClick = useCallback(
    (event: MapMouseEvent): void => {
      // Получаем текущее действие рисования из Ref
      const action = drawActionRef.current;

      // Если действие рисования не выбрано — ничего не делаем
      if (!action) return;

      // Формируем координаты точки клика [долгота, широта]
      const coords: [number, number] = [event.lngLat.lng, event.lngLat.lat];

      // Вызываем callback onUpdateGeoData с обновленными геоданными
      // Используем normalizeGeoData для корректной структуры данных
      onUpdateGeoData(
        updateGeoData(
          normalizeGeoData(tempGeoData),
          coords,
          action
        )
      );
    },
    [tempGeoData, onUpdateGeoData]
  );

  /**
   * Эффект подписки на события клика карты
   * - Добавляет обработчик клика при монтировании
   * - Убирает обработчик при размонтировании или изменении handleMapClick
   */
  useEffect(() => {
    const map = mapRef.current;

    // Если карта еще не инициализирована — выходим
    if (!map) return;

    // Подписка на клик карты
    map.on("click", handleMapClick);

    // Очистка подписки при размонтировании или изменении callback
    return () => {
      map.off("click", handleMapClick);
    };
  }, [handleMapClick, mapRef]);
};
