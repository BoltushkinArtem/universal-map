import { FC } from "react";
import styles from "./GeoEditorPanel.module.scss";
import { DrawActionType } from "../../engines/drawActionType";
import { GeoData } from "../../engines/geoDataType";

/**
 * Пропсы для компонента GeoEditorPanel
 */
interface GeoEditorPanelProps {
  /** Текущий выбранный режим рисования */
  drawActionType?: DrawActionType;

  /** Вызывается при смене режима рисования */
  onDrawAction: (type?: DrawActionType) => void;

  /** Вызывается при обновлении временных геоданных */
  onUpdateGeoData: (data: GeoData) => void;

  /** Завершает текущее редактирование */
  onFinishEditing: () => void;

  /** Отменяет текущее редактирование */
  onCancelEditing: () => void;

  /** Удаляет последнюю точку активной линии */
  onDeleteLastPoint: () => void;
}

/** Описание действия рисования для кнопки */
interface DrawAction {
  label: string;
  type: DrawActionType | undefined;
  enabled: boolean;
}

/**
 * Панель управления редактированием геоданных на карте.
 * Отображает кнопки для выбора режима рисования и управления текущей сессией редактирования.
 */
const GeoEditorPanel: FC<GeoEditorPanelProps> = ({
  drawActionType,
  onDrawAction,
  onUpdateGeoData,
  onFinishEditing,
  onCancelEditing,
  onDeleteLastPoint,
}) => {
  /** Доступные действия рисования */
  const drawActions: DrawAction[] = [
    { label: "Draw a polyline", type: DrawActionType.POLYLINE, enabled: true },
    { label: "Draw a marker", type: DrawActionType.MARKER, enabled: true },
    { label: "Draw a polygon", type: undefined, enabled: false },
    { label: "Draw a rectangle", type: undefined, enabled: false },
    { label: "Draw a multi polyline", type: undefined, enabled: false },
    { label: "Draw a multi polygon", type: undefined, enabled: false },
  ];

  /**
   * Обработка нажатия на кнопку выбора режима рисования.
   * - Устанавливает новый режим
   * - Очищает временные геоданные
   *
   * @param type - Новый режим рисования
   */
  const handleActionClick = (type?: DrawActionType) => {
    onDrawAction(type);

    onUpdateGeoData({
      type: "FeatureCollection",
      features: [],
    });
  };

  /**
   * Рендер кнопок управления текущей сессией редактирования
   * - Cancel, Delete last point, Finish в зависимости от режима
   */
  const renderActiveActionButtons = () => {
    if (drawActionType === DrawActionType.POLYLINE) {
      return (
        <div className={styles.menuButtons}>
          <button className={styles.menuButton} onClick={onCancelEditing}>
            Cancel
          </button>
          <button className={styles.menuButton} onClick={onDeleteLastPoint}>
            Delete last point
          </button>
          <button className={styles.menuButton} onClick={onFinishEditing}>
            Finish
          </button>
        </div>
      );
    }

    if (drawActionType === DrawActionType.MARKER) {
      return (
        <div className={styles.menuButtons}>
          <button className={styles.menuButton} onClick={onCancelEditing}>
            Cancel
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>Geo Editor</h4>

      <div className={styles.actionButtons}>
        {drawActions.map(({ label, type, enabled }) => (
          <button
            key={label}
            className={`${styles.button} ${!enabled ? styles.disabled : ""}`}
            disabled={!enabled}
            onClick={() => enabled && handleActionClick(type)}
          >
            {label}
          </button>
        ))}
      </div>

      {renderActiveActionButtons()}
    </div>
  );
};

export default GeoEditorPanel;
