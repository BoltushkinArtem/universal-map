import { useEffect, useCallback, useRef } from "react";
import { DrawActionType } from "../../drawActionType";
import { GeoData } from "../../geoDataType";
import { normalizeGeoData } from "../../../utils/geoDataNormalizer";
import { updateGeoData } from "../../../utils/updateGeoData";

/**
 * Пропсы хука useGoogleDrawHandler
 */
interface UseGoogleDrawHandlerProps {
  /** Ref на объект карты Google */
  mapRef: React.RefObject<google.maps.Map | null>;

  /** Текущий режим рисования (Point или LineString) */
  drawActionType?: DrawActionType;

  /** Временные геоданные для обновления при кликах */
  tempGeoData: GeoData;

  /** Callback для передачи обновлённых геоданных */
  onUpdateGeoData: (data: GeoData) => void;
}

/**
 * useGoogleDrawHandler — хук обработки кликов по карте Google
 *
 * Логика:
 * 1. Сохраняет текущее действие рисования в ref, чтобы не зависеть от замыканий useEffect.
 * 2. Сохраняет временные геоданные в ref для актуального обновления при кликах.
 * 3. Подписывается на событие клика по карте и добавляет новые точки или линии.
 * 4. Очищает слушатель при размонтировании или изменении зависимостей.
 *
 * @param mapRef - Ref на объект карты Google
 * @param drawActionType - текущий режим рисования
 * @param tempGeoData - временные геоданные
 * @param onUpdateGeoData - callback для обновления геоданных
 */
export const useGoogleDrawHandler = ({
  mapRef,
  drawActionType,
  tempGeoData,
  onUpdateGeoData,
}: UseGoogleDrawHandlerProps): void => {
  /**
   * Ref для хранения текущего режима рисования
   * Не зависит от замыканий useEffect и useCallback
   */
  const drawActionRef = useRef<DrawActionType | undefined>(drawActionType);

  /**
   * Ref для хранения актуальных временных геоданных
   * Чтобы handleMapClick всегда использовал свежие данные
   */
  const tempGeoDataRef = useRef<GeoData>(tempGeoData);

  /**
   * Ref для хранения слушателя клика по карте
   * Нужно для корректного удаления слушателя при размонтировании
   */
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  /**
   * Эффект для синхронизации drawActionRef с текущим drawActionType
   */
  useEffect(() => {
    drawActionRef.current = drawActionType;
  }, [drawActionType]);

  /**
   * Эффект для синхронизации tempGeoDataRef с актуальными временными данными
   */
  useEffect(() => {
    tempGeoDataRef.current = tempGeoData;
  }, [tempGeoData]);

  /**
   * Обработчик клика по карте
   * - Преобразует координаты в [lng, lat]
   * - Обновляет временные геоданные через normalize -> updateGeoData
   * - Вызывает onUpdateGeoData
   */
  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!event.latLng || !drawActionRef.current) return;

      const coords: [number, number] = [event.latLng.lng(), event.latLng.lat()];
      const updatedGeoData = updateGeoData(
        normalizeGeoData(tempGeoDataRef.current),
        coords,
        drawActionRef.current
      );

      onUpdateGeoData(updatedGeoData);
    },
    [onUpdateGeoData]
  );

  /**
   * Эффект подписки на клики по карте
   * - Срабатывает при наличии карты и активного режима рисования
   * - Возвращает функцию очистки слушателя
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !drawActionRef.current) return;

    clickListenerRef.current = map.addListener("click", handleMapClick);

    return () => {
      clickListenerRef.current?.remove();
      clickListenerRef.current = null;
    };
  }, [mapRef, handleMapClick]);
};
