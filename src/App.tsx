import React, { useState, FC } from "react";
import ProviderSelector from "./components/ProviderSelector";
import MapEngineWrapper from "./components/MapEngineWrapper";
import GeoEditorPanel from "./components/GeoEditorPanel";
import markerIcon from "./assets/icons/marker.png";
import styles from "./App.module.scss";
import { DrawActionType } from "./engines/drawActionType";

const App: FC = () => {
  const [provider, setProvider] = useState<string>("MapLibre_OSM");
  const [drawActionType, setDrawActionType] = useState<DrawActionType>();
  const [tempPolylinePoints, setTempPolylinePoints] = useState<[number, number][]>([]);
  const [savedPolylines, setSavedPolylines] = useState<[number, number][][]>([]);

  // Обновление временной полилинии
  const handleUpdatePoints = (points: [number, number][]) => setTempPolylinePoints(points);

  // Завершение полилинии: сохраняем её отдельно
  const handleFinishPolyline = () => {
    if (tempPolylinePoints.length > 0) {
      setSavedPolylines([...savedPolylines, tempPolylinePoints]);
      setTempPolylinePoints([]);
      setDrawActionType(undefined);
    }
  };

  // Отмена текущей полилинии
  const handleCancelPolyline = () => {
    setTempPolylinePoints([]);
    setDrawActionType(undefined);
  };

  // Удаление последней точки временной полилинии
  const handleDeleteLastPoint = () => {
    setTempPolylinePoints(tempPolylinePoints.slice(0, tempPolylinePoints.length - 1));
  };

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
          tempPolylinePoints={tempPolylinePoints}
          onDrawAction={setDrawActionType}
          onUpdatePoints={handleUpdatePoints}
          onFinishPolyline={handleFinishPolyline}
          onCancelPolyline={handleCancelPolyline}
          onDeleteLastPoint={handleDeleteLastPoint}
        />

        <div className={styles.mapArea}>
          <MapEngineWrapper
            providerId={provider}
            drawActionType={drawActionType}
            markerIconUrl={markerIcon}
            tempPolylinePoints={tempPolylinePoints}
            savedPolylines={savedPolylines}
            onUpdatePoints={handleUpdatePoints}
          />
        </div>
      </div>
    </>
  );
};

export default App;
