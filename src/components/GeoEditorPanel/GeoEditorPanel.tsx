import React, { FC } from "react";
import styles from "./GeoEditorPanel.module.scss";

/** Пропсы компонента GeoEditorPanel */
interface GeoEditorPanelProps {
  /** Колбэк, вызываемый при выборе действия рисования */
  onDrawAction: (type: string) => void;
}

/** Интерфейс описания одной кнопки действия рисования */
interface DrawAction {
  /** Текст на кнопке */
  label: string;
  /** Тип действия, передаваемый в колбэк */
  type: string;
  /** Флаг активности кнопки */
  enabled: boolean;
}

/**
 * GeoEditorPanel — панель инструментов для рисования геометрических фигур на карте.
 * Все кнопки, кроме "marker", отображаются как disabled.
 */
const GeoEditorPanel: FC<GeoEditorPanelProps> = ({ onDrawAction }) => {
  /** Список доступных действий с указанием, какие кнопки активны */
  const drawActions: DrawAction[] = [
    { label: "Draw a polyline", type: "polyline", enabled: false },
    { label: "Draw a polygon", type: "polygon", enabled: false },
    { label: "Draw a rectangle", type: "rectangle", enabled: false },
    { label: "Draw a marker", type: "marker", enabled: true },
    { label: "Draw a multi polyline", type: "multiPolyline", enabled: false },
    { label: "Draw a multi polygon", type: "multiPolygon", enabled: false },
  ];

  return (
    <div className={styles.container}>
      {/* Заголовок панели */}
      <h4 className={styles.title}>Geo Editor</h4>

      {/* Генерация кнопок действий */}
      {drawActions.map((action) => (
        <button
          key={action.type} // уникальный ключ для React
          className={`${styles.button} ${!action.enabled ? styles.disabled : ""}`} // стиль disabled для неактивных кнопок
          onClick={() => action.enabled && onDrawAction(action.type)} // вызов колбэка только если кнопка активна
          disabled={!action.enabled} // стандартный HTML-атрибут disabled
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default GeoEditorPanel;
