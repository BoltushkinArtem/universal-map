import { useEffect, useRef } from "react";
import { DrawActionType } from "../../drawActionType";

/**
 * Хук управления курсором карты Yandex.
 *
 * Логика:
 * - Если drawActionType задан — курсор "crosshair".
 * - Если drawActionType отсутствует — курсор "grab".
 * - Создаёт динамический тег <style> и вставляет CSS для конкретного контейнера карты.
 *
 * @param containerRef - Ref на DOM-элемент контейнера карты Yandex
 * @param containerIdRef - Ref на строковый ID контейнера карты (используется для локального CSS)
 * @param drawActionType - Текущий режим рисования (Point | LineString)
 */
export const useYandexMapCursor = (
  containerRef: React.RefObject<HTMLDivElement>,
  containerIdRef: React.RefObject<string | null>,
  drawActionType?: DrawActionType
): void => {
  /**
   * Ref для хранения <style> тега.
   * Позволяет повторно использовать тег и не создавать новый при каждом рендере.
   */
  const styleTagRef = useRef<HTMLStyleElement | null>(null);

  /**
   * Эффект управления курсором карты.
   * - Создаёт <style> если ещё не существует.
   * - Вставляет CSS с нужным курсором.
   * - Обновляется при изменении drawActionType, containerRef или containerIdRef.
   */
  useEffect(() => {
    const container = containerRef.current;
    const containerId = containerIdRef.current;

    // Если контейнер или его ID ещё не готовы — ничего не делаем
    if (!container || !containerId) return;

    // Создаём <style> тег один раз для локального CSS
    if (!styleTagRef.current) {
      const styleTag = document.createElement("style");
      document.head.appendChild(styleTag);
      styleTagRef.current = styleTag;
    }

    // Вставляем CSS-перезапись курсора для карты Yandex
    styleTagRef.current.innerHTML = `
      #${containerId} .ymaps-2-1-79-map,
      #${containerId} .ymaps-2-1-79-map * {
        cursor: ${drawActionType ? "crosshair" : "grab"} !important;
      }
    `;
  }, [drawActionType, containerRef, containerIdRef]);
};
