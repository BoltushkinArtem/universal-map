import React, { FC } from "react";
import styles from "./GeoEditorPanel.module.scss";
import { DrawActionType } from "../../engines/drawActionType";

interface GeoEditorPanelProps {
  drawActionType?: DrawActionType;
  tempPolylinePoints: [number, number][];
  onDrawAction: (type?: DrawActionType) => void;
  onUpdatePoints: (points: [number, number][]) => void;
  onFinishPolyline: () => void;
  onCancelPolyline: () => void;
  onDeleteLastPoint: () => void;
}

interface DrawAction {
  label: string;
  type: string;
  enabled: boolean;
}

const GeoEditorPanel: FC<GeoEditorPanelProps> = ({
  drawActionType,
  tempPolylinePoints,
  onDrawAction,
  onUpdatePoints,
  onFinishPolyline,
  onCancelPolyline,
  onDeleteLastPoint,
}) => {
  const drawActions: DrawAction[] = [
    { label: "Draw a polyline", type: "polyline", enabled: true },
    { label: "Draw a marker", type: "marker", enabled: true },
    { label: "Draw a polygon", type: "polygon", enabled: false },
    { label: "Draw a rectangle", type: "rectangle", enabled: false },
    { label: "Draw a multi polyline", type: "multiPolyline", enabled: false },
    { label: "Draw a multi polygon", type: "multiPolygon", enabled: false },
  ];

  const handleActionClick = (type: string) => {
    const selectedType: DrawActionType | undefined =
      type === "marker" ? DrawActionType.MARKER :
      type === "polyline" ? DrawActionType.POLYLINE :
      undefined;

    onDrawAction(selectedType);
    onUpdatePoints([]); // начинаем новую полилинию
  };

  const renderPolylineButtons = () => {
    if (drawActionType === DrawActionType.POLYLINE) {
      return (
        <div className={styles.menuButtons}>
          <button className={styles.menuButton} onClick={onCancelPolyline}>Cancel</button>
          <button className={styles.menuButton} onClick={onDeleteLastPoint}>Delete last point</button>
          <button className={styles.menuButton} onClick={onFinishPolyline}>Finish</button>
        </div>
      );
    }

    if (drawActionType === DrawActionType.MARKER) {
      return (
        <div className={styles.menuButtons}>
          <button className={styles.menuButton} onClick={() => onDrawAction(undefined)}>Cancel</button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>Geo Editor</h4>
      <div className={styles.actionButtons}>
        {drawActions.map(action => (
          <button
            key={action.type}
            className={`${styles.button} ${!action.enabled ? styles.disabled : ""}`}
            disabled={!action.enabled}
            onClick={() => action.enabled && handleActionClick(action.type)}
          >
            {action.label}
          </button>
        ))}
      </div>
      {renderPolylineButtons()}
    </div>
  );
};

export default GeoEditorPanel;
