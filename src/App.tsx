import React, { useState, FC } from "react";
import ProviderSelector from "./components/ProviderSelector";
import MapEngineWrapper from "./components/MapEngineWrapper";
import GeoEditorPanel from "./components/GeoEditorPanel";
import markerIcon from "./assets/icons/marker.png";
import styles from "./App.module.scss";

/**
 * Главный компонент приложения: отображает карту с выбором провайдера и панелью редактора геометрии.
 */
const App: FC = () => {
  // Текущий выбранный провайдер карты
  const [provider, setProvider] = useState<string>("MapLibre_OSM");

  // Флаг, показывающий нужно ли отрисовывать маркер на карте
  const [drawMarker, setDrawMarker] = useState<boolean>(false);

  /**
   * Обработчик выбора действия рисования на карте
   * @param type - тип действия ("polyline", "polygon", "marker" и т.д.)
   */
  const handleDrawAction = (type: string): void => {
    console.log("Draw action selected:", type);
    setDrawMarker(type === "marker");
  };

  return (
    <>
      {/* Шапка приложения */}
      <header className={styles.appHeader}>
        <div className={styles.title}>Universal Map</div>
        <div className={styles.subtitle}>
          Switch providers in top-right. Clean map view.
        </div>
      </header>

      {/* Основная область приложения с картой и панелями */}
      <div className={styles.appContainer}>
        {/* Селектор провайдера в правом верхнем углу */}
        <div className={styles.providerWrapper}>
          <ProviderSelector value={provider} onChange={setProvider} />
        </div>

        {/* Панель инструментов для рисования */}
        <GeoEditorPanel onDrawAction={handleDrawAction} />

        {/* Область карты */}
        <div className={styles.mapArea}>
          <MapEngineWrapper
            providerId={provider}
            drawMarkerOn={drawMarker}
            markerIconUrl={markerIcon}
          />
        </div>
      </div>
    </>
  );
};

export default App;
