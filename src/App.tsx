import { FC, useState, useEffect } from "react";
import ProviderSelector from "./components/ProviderSelector";
import MapEngineWrapper from "./components/MapEngineWrapper";
import GeoEditorPanel from "./components/GeoEditorPanel";
import markerIcon from "./assets/icons/marker.png";
import styles from "./App.module.scss";
import { DrawActionType } from "./engines/drawActionType";
import { GeoData } from "./engines/geoDataType";

const App: FC = () => {
    const [provider, setProvider] = useState("MapLibre_OSM");
    const [drawActionType, setDrawActionType] = useState<DrawActionType>();

    const [tempGeoData, setTempGeoData] = useState<GeoData>({
        type: "FeatureCollection",
        features: [],
    });

    const [savedGeoData, setSavedGeoData] = useState<GeoData>({
        type: "FeatureCollection",
        features: [],
    });

    /**
     * Основной обработчик обновлений геоданных.
     * - При любом изменении данных обновляем состояние tempGeoData.
     * - Если в режиме DrawActionType.MARKER добавлена новая точка — сразу выполняем Finish.
     */
    const handleUpdateGeoData = (data: GeoData) => {
        // Считаем количество точек до и после обновления
        const prevPoints = tempGeoData.features.filter(f => f.geometry.type === "Point").length;
        const newPoints = data.features.filter(f => f.geometry.type === "Point").length;

        setTempGeoData(data);

        // Если мы в режиме "Marker" и добавлена новая точка — сразу завершаем редактирование
        if (drawActionType === DrawActionType.MARKER && newPoints > prevPoints) {
            handleFinishEditing(data);
        }
    };

    /**
     * Завершает текущее редактирование:
     * переносит все временные фичи в сохранённые и очищает временные данные.
     */
    const handleFinishEditing = (dataOverride?: GeoData) => {
        const sourceData = dataOverride ?? tempGeoData;

        if (sourceData.features.length > 0) {
            setSavedGeoData(prev => ({
                type: "FeatureCollection",
                features: [
                    ...prev.features,
                    ...sourceData.features.map(f => ({
                        ...f,
                        properties: { ...f.properties, isTemp: false },
                    })),
                ],
            }));

            setTempGeoData({ type: "FeatureCollection", features: [] });
            setDrawActionType(undefined);
        }
    };

    /**
     * Отмена текущего рисования — очищает временные данные и сбрасывает режим.
     */
    const handleCancelEditing = () => {
        setTempGeoData({ type: "FeatureCollection", features: [] });
        setDrawActionType(undefined);
    };

    /**
     * Удаление последней точки активной линии.
     */
    const handleDeleteLastPoint = () => {
        const updated = structuredClone(tempGeoData);
        const lastLine = [...updated.features]
            .reverse()
            .find(f => f.geometry.type === "LineString" && f.properties?.isTemp);

        if (lastLine && lastLine.geometry.type === "LineString") {
            lastLine.geometry.coordinates.pop();
            if (lastLine.geometry.coordinates.length === 0) {
                updated.features = updated.features.filter(f => f !== lastLine);
            }
            setTempGeoData(updated);
        }
    };

    useEffect(() => {
        handleCancelEditing()
    }, [provider])

    return (
        <>
            <header className={styles.appHeader}>
                <div className={styles.title}>Universal Map</div>
                <div className={styles.subtitle}>Switch providers in top-right. Clean map view.</div>
            </header>

            <div className={styles.appContainer}>
                <div className={styles.providerWrapper}>
                    <ProviderSelector value={provider} onChange={setProvider} />
                </div>

                <GeoEditorPanel
                    drawActionType={drawActionType}
                    onDrawAction={setDrawActionType}
                    onUpdateGeoData={handleUpdateGeoData}
                    onFinishEditing={() => handleFinishEditing()}
                    onCancelEditing={handleCancelEditing}
                    onDeleteLastPoint={handleDeleteLastPoint}
                />

                <div className={styles.mapArea}>
                    <MapEngineWrapper
                        providerId={provider}
                        drawActionType={drawActionType}
                        markerIconUrl={markerIcon}
                        tempGeoData={tempGeoData}
                        savedGeoData={savedGeoData}
                        onUpdateGeoData={handleUpdateGeoData}
                    />
                </div>
            </div>
        </>
    );
};

export default App;
