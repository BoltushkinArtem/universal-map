import React, { FC } from "react";
import styles from "./GeoEditorPanel.module.scss";
import { DrawActionType } from "../../engines/drawActionType";

interface GeoEditorPanelProps {
    onDrawAction: (type: DrawActionType) => void;
}

interface DrawAction {
    label: string;
    type: string;
    enabled: boolean;
}

const GeoEditorPanel: FC<GeoEditorPanelProps> = ({ onDrawAction }) => {
    const drawActions: DrawAction[] = [
        { label: "Draw a polyline", type: "polyline", enabled: true },
        { label: "Draw a polygon", type: "polygon", enabled: false },
        { label: "Draw a rectangle", type: "rectangle", enabled: false },
        { label: "Draw a marker", type: "marker", enabled: true },
        { label: "Draw a multi polyline", type: "multiPolyline", enabled: false },
        { label: "Draw a multi polygon", type: "multiPolygon", enabled: false },
    ];

    const onClickHandler = (type: string) => {
        const drawActionType: DrawActionType = type === "marker"
            ? DrawActionType.MARKER
            : type === "polyline"
                ? DrawActionType.POLYLINE
                : DrawActionType.MARKER
        onDrawAction(drawActionType)
    }

    return (
        <div className={styles.container}>
            <h4 className={styles.title}>Geo Editor</h4>
            {drawActions.map((action) => (
                <button
                    key={action.type}
                    className={`${styles.button} ${!action.enabled ? styles.disabled : ""}`}
                    onClick={() => action.enabled && onClickHandler(action.type)}
                    disabled={!action.enabled}
                >
                    {action.label}
                </button>
            ))}
        </div>
    );
};

export default GeoEditorPanel;
