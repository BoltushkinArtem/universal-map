import { FC, useState } from "react";
import ProviderSelector from "./components/ProviderSelector";
import MapEngineWrapper from "./components/MapEngineWrapper";
import GeoEditorPanel from "./components/GeoEditorPanel";
import markerIcon from "./assets/icons/marker.png";
import styles from "./App.module.scss";
import { DrawActionType } from "./engines/drawActionType";

const App: FC = () => {
  const [provider, setProvider] = useState("MapLibre_OSM");
  const [drawActionType, setDrawActionType] = useState<DrawActionType>();

  const [tempGeoData, setTempGeoData] = useState<GeoJSON.FeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });

  const [savedGeoData, setSavedGeoData] = useState<GeoJSON.FeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });

  const handleUpdateGeoData = (data: GeoJSON.FeatureCollection) => {
    setTempGeoData(data);
  };

  const handleFinishEditing = () => {
    if (tempGeoData.features.length > 0) {
      setSavedGeoData({
        type: "FeatureCollection",
        features: [...savedGeoData.features, ...tempGeoData.features.map(f => ({ ...f, properties: { ...f.properties, isTemp: false } }))],
      });
      setTempGeoData({ type: "FeatureCollection", features: [] });
      setDrawActionType(undefined);
    }
  };

  const handleCancelEditing = () => {
    setTempGeoData({ type: "FeatureCollection", features: [] });
    setDrawActionType(undefined);
  };

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
          tempGeoData={tempGeoData}
          onDrawAction={setDrawActionType}
          onUpdateGeoData={handleUpdateGeoData}
          onFinishEditing={handleFinishEditing}
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
