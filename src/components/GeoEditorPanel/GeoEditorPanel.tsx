import { FC } from "react";
import styles from "./GeoEditorPanel.module.scss";
import { DrawActionType } from "../../engines/drawActionType";

interface GeoEditorPanelProps {
    drawActionType?: DrawActionType;
    onDrawAction: (type?: DrawActionType) => void;
    onUpdateGeoData: (data: GeoJSON.FeatureCollection) => void;
    onFinishEditing: () => void;
    onCancelEditing: () => void;
    onDeleteLastPoint: () => void;
}

interface DrawAction {
    label: string;
    type: DrawActionType | undefined;
    enabled: boolean;
}

const GeoEditorPanel: FC<GeoEditorPanelProps> = ({
    drawActionType,
    onDrawAction,
    onUpdateGeoData,
    onFinishEditing,
    onCancelEditing,
    onDeleteLastPoint,
}) => {
    const drawActions: DrawAction[] = [
        { label: "Draw a polyline", type: DrawActionType.POLYLINE, enabled: true },
        { label: "Draw a marker", type: DrawActionType.MARKER, enabled: true },
        { label: "Draw a polygon", type: undefined, enabled: false },
        { label: "Draw a rectangle", type: undefined, enabled: false },
        { label: "Draw a multi polyline", type: undefined, enabled: false },
        { label: "Draw a multi polygon", type: undefined, enabled: false },
    ];

    const handleActionClick = (type?: DrawActionType) => {
        onDrawAction(type);

        // Очистка временных данных при старте нового режима рисования
        onUpdateGeoData({
            type: "FeatureCollection",
            features: [],
        });
    };

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
