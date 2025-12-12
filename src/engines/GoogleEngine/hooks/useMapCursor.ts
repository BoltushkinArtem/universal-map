import { useEffect } from "react";
import { DrawActionType } from "../../drawActionType";

/**
 * Хук управления курсором карты (MapLibre / Google Maps).
 *
 * Логика работы:
 * 1. Если containerIdRef не задан — хук ничего не делает.
 * 2. Если styleTagRef ещё не создан — создается новый <style> тег и добавляется в <head>.
 * 3. В зависимости от drawActionType:
 *    - "crosshair" — при активном режиме рисования.
 *    - "grab" — при отсутствии действия.
 * 4. Вставляет локальный CSS, который меняет курсор на всем контейнере карты.
 *
 * @param containerIdRef - Ref на строковый ID контейнера карты (используется для селектора CSS)
 * @param styleTagRef - Ref на тег <style>, в который вставляется локальный CSS
 * @param drawActionType - Текущий режим рисования (MARKER | POLYLINE | undefined)
 */
export const useMapCursor = (
  containerIdRef: React.RefObject<string>,
  styleTagRef: React.RefObject<HTMLStyleElement | null>,
  drawActionType?: DrawActionType
): void => {
  useEffect(() => {
    // Получаем ID контейнера карты из ref
    const containerId = containerIdRef.current;
    if (!containerId) return; // Если ID нет, выходим

    // Получаем существующий <style> тег или создаем новый
    let style = styleTagRef.current;
    if (!style) {
      style = document.createElement("style");
      styleTagRef.current = style;
      document.head.appendChild(style);
    }

    // Определяем стиль курсора в зависимости от режима рисования
    const cursorStyle = drawActionType ? "crosshair" : "grab";

    // Вставляем CSS для локального контейнера карты
    // Перезаписываем все дочерние элементы .gm-style, чтобы курсор был единым
    style.innerHTML = `
      #${containerId} .gm-style,
      #${containerId} .gm-style * {
        cursor: ${cursorStyle} !important;
      }
    `;
  }, [containerIdRef, styleTagRef, drawActionType]);
};
