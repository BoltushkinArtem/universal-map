import React, { useState, FC } from "react";
import ProviderSelector from "./components/ProviderSelector";
import MapEngineWrapper from "./components/MapEngineWrapper";
import GeoEditorPanel from "./components/GeoEditorPanel";
import markerIcon from "./assets/icons/marker.png";
import styles from "./App.module.scss";

/**
 * Главный компонент приложения.
 * Отображает карту с выбором провайдера и панелью инструментов для рисования.
 */
const App: FC = () => {
  const [provider, setProvider] = useState<string>("MapLibre_OSM");
  const [drawMarker, setDrawMarker] = useState<boolean>(false);
  const [drawPolyline, setDrawPolyline] = useState<boolean>(false);

  /** Обработчик выбора действия рисования */
  const handleDrawAction = (type: string): void => {
    setDrawMarker(type === "marker");
    setDrawPolyline(type === "polyline");
  };

  return (
    <>
      <header className={styles.appHeader}>
        <div className={styles.title}>Universal Map</div>
        <div className={styles.subtitle}>
          Switch providers in top-right. Clean map view.
        </div>
      </header>

      <div className={styles.appContainer}>
        <div className={styles.providerWrapper}>
          <ProviderSelector value={provider} onChange={setProvider} />
        </div>

        <GeoEditorPanel onDrawAction={handleDrawAction} />

        <div className={styles.mapArea}>
          <MapEngineWrapper
            providerId={provider}
            drawMarkerOn={drawMarker}
            drawPolylineOn={drawPolyline}
            markerIconUrl={markerIcon}
          />
        </div>
      </div>
    </>
  );
};

export default App;
