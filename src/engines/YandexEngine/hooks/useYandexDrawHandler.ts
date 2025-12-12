import { useRef, useEffect, useCallback } from "react";
import { GeoData } from "../../geoDataType";
import { DrawActionType } from "../../drawActionType";
import { updateGeoData } from "../../../utils/updateGeoData";
import { normalizeGeoData } from "../../../utils/geoDataNormalizer";
import { fromYandexCoords } from "../utils/coordinateConverter";

/**
 * Хук подписки на клики карты Yandex для добавления точек или линий.
 *
 * Логика:
 * 1. Сохраняет текущий режим рисования в drawActionRef для стабильного доступа в колбэке.
 * 2. Подписывается на событие "click" карты.
 * 3. При клике преобразует координаты через fromYandexCoords.
 * 4. Вызывает onUpdateGeoData с обновленными GeoData через updateGeoData.
 *
 * @param mapRef - Ref на экземпляр карты Yandex (window.ymaps.Map)
 * @param tempGeoData - Временные геоданные, которые редактируются пользователем
 * @param drawActionType - Текущий режим рисования (Point | LineString)
 * @param onUpdateGeoData - Callback для обновления геоданных после действия пользователя
 */
export const useYandexDrawHandler = (
  mapRef: React.RefObject<any>,
  tempGeoData: GeoData,
  drawActionType: DrawActionType | undefined,
  onUpdateGeoData: (data: GeoData) => void
) => {
  /**
   * Ref для хранения текущего действия рисования.
   * Используется внутри handleClick, чтобы не пересоздавать колбэк при каждом рендере.
   */
  const drawActionRef = useRef(drawActionType);

  /**
   * Синхронизация drawActionRef с пропсом drawActionType.
   * Позволяет колбэку handleClick использовать актуальное значение.
   */
  useEffect(() => {
    drawActionRef.current = drawActionType;
  }, [drawActionType]);

  /**
   * Обработчик клика по карте.
   * - Преобразует координаты Yandex в формат [lng, lat]
   * - Обновляет GeoData в зависимости от текущего режима рисования
   */
  const handleClick = useCallback(
    (e: any) => {
      if (!mapRef.current) return;

      // Преобразуем координаты из формата Yandex в [lng, lat]
      const coords: [number, number] = fromYandexCoords(e.get("coords"));

      // Получаем текущее действие рисования
      const action = drawActionRef.current;
      if (!action) return;

      // Обновляем временные геоданные, создаем новые или дополняем существующие
      const updatedGeoData = updateGeoData(
        normalizeGeoData(tempGeoData),
        coords,
        action
      );

      onUpdateGeoData(updatedGeoData);
    },
    [tempGeoData, onUpdateGeoData, mapRef]
  );

  /**
   * Подписка на клики карты и очистка подписки при размонтировании или смене mapRef.
   */
  useEffect(() => {
    if (!mapRef.current) return;

    // Добавляем обработчик клика
    mapRef.current.events.add("click", handleClick);

    // Очистка обработчика при размонтировании
    return () => {
      if (mapRef.current) {
        mapRef.current.events.remove("click", handleClick);
      }
    };
  }, [mapRef, handleClick]);
};
