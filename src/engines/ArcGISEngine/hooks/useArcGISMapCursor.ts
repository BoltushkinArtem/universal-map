import { useEffect } from "react";
import { DrawActionType } from "../../drawActionType";

/**
 * Хук управления курсором контейнера ArcGIS карты.
 *
 * Логика работы:
 * - Если drawActionType задан — курсор меняется на "crosshair" (режим рисования активен)
 * - Если drawActionType отсутствует — курсор меняется на "grab" (обычный режим)
 *
 * Особенности:
 * - Эффект автоматически срабатывает при изменении drawActionType.
 * - При размонтировании компонента курсор сбрасывается на "grab", чтобы DOM оставался в корректном состоянии.
 *
 * @param containerRef - Ref на DOM-элемент контейнера карты ArcGIS
 * @param drawActionType - Тип текущего действия рисования (MARKER / POLYLINE / undefined)
 */
export const useArcGISMapCursor = (
  containerRef: React.RefObject<HTMLDivElement>,
  drawActionType?: DrawActionType
): void => {
  useEffect(() => {
    // Если контейнер ещё не смонтирован, ничего не делаем
    if (!containerRef.current) return;

    // Выбираем стиль курсора:
    // "crosshair" при активном режиме рисования, иначе "grab"
    const cursorStyle: string = drawActionType ? "crosshair" : "grab";

    // Применяем выбранный стиль курсора к контейнеру карты
    containerRef.current.style.cursor = cursorStyle;

    /**
     * Функция очистки эффекта:
     * - При размонтировании компонента курсор сбрасывается на "grab"
     * - Гарантирует корректное состояние DOM после удаления компонента карты
     */
    return () => {
      if (containerRef.current) {
        containerRef.current.style.cursor = "grab";
      }
    };
  }, [containerRef, drawActionType]); // Эффект срабатывает при изменении drawActionType или контейнера
};
