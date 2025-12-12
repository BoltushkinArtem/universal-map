import { useEffect } from "react";
import { Map as MapLibreMap } from "maplibre-gl";
import { DrawActionType } from "../../drawActionType";

/**
 * Хук управления курсором карты MapLibre.
 *
 * Логика:
 * - Если карта не готова (mapReady === false) или mapRef не установлен — хук ничего не делает.
 * - Если установлен drawActionType — курсор меняется на "crosshair".
 * - Если drawActionType отсутствует — курсор сбрасывается на дефолтный.
 *
 * @param mapRef - Ref на экземпляр карты MapLibre
 * @param drawActionType - Тип текущего действия рисования (MARKER / POLYLINE / undefined)
 * @param mapReady - Флаг готовности карты. Только после true можно менять курсор.
 */
export const useMapCursor = (
  mapRef: React.RefObject<MapLibreMap | null>,
  drawActionType?: DrawActionType,
  mapReady?: boolean
): void => {
  useEffect(() => {
    // Если карта ещё не готова или mapRef не указывает на карту — ничего не делаем
    if (!mapReady || !mapRef.current) return;

    /**
     * Выбор стиля курсора:
     * - "crosshair" при активном рисовании
     * - "" (дефолт) при отсутствии действия
     */
    const cursorStyle: string = drawActionType ? "crosshair" : "";

    // Устанавливаем курсор на элемент canvas карты
    mapRef.current.getCanvas().style.cursor = cursorStyle;

    /**
     * Опционально можно вернуть функцию очистки эффекта,
     * чтобы при размонтировании компонента курсор сбросился на дефолтный.
     */
    return () => {
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = "";
      }
    };
  }, [mapRef, drawActionType, mapReady]); // зависимость от карты, действия и готовности карты
};
