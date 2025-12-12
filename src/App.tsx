import { FC, useState, useEffect, useRef, useCallback } from "react";

import ProviderSelector from "./components/ProviderSelector";
import MapEngineWrapper from "./components/MapEngineWrapper";
import GeoEditorPanel from "./components/GeoEditorPanel";

import markerIcon from "./assets/icons/marker.png";

import styles from "./App.module.scss";

import { DrawActionType } from "./engines/drawActionType";
import { GeoData } from "./engines/geoDataType";

const App: FC = () => {
  // Выбранный провайдер карты
  const [provider, setProvider] = useState<string>("MapLibre_OSM");

  // Текущий тип действия рисования
  const [drawActionType, setDrawActionType] = useState<DrawActionType | undefined>();

  // Ref для актуального значения drawActionType
  const drawActionRef = useRef<DrawActionType | undefined>(drawActionType);

  // Временные геоданные (редактируемые)
  const [tempGeoData, setTempGeoData] = useState<GeoData>({
    type: "FeatureCollection",
    features: [],
  });

  // Сохранённые геоданные
  const [savedGeoData, setSavedGeoData] = useState<GeoData>({
    type: "FeatureCollection",
    features: [],
  });

  // Обновляем ref при изменении drawActionType
  useEffect(() => {
    drawActionRef.current = drawActionType;
  }, [drawActionType]);

  /**
   * Обработчик обновления геоданных.
   * - Обновляет tempGeoData.
   * - Если режим MARKER и добавлена новая точка — сразу сохраняет.
   */
  const handleUpdateGeoData = useCallback(
    (updatedData: GeoData) => {
      const previousPointsCount = tempGeoData.features.filter(f => f.geometry.type === "Point").length;
      const newPointsCount = updatedData.features.filter(f => f.geometry.type === "Point").length;

      setTempGeoData(updatedData);

      if (drawActionRef.current === DrawActionType.MARKER && newPointsCount > previousPointsCount) {
        handleFinishEditing(updatedData);
      }
    },
    [tempGeoData]
  );

  /**
   * Завершает редактирование:
   * - Переносит все временные фичи в сохранённые.
   * - Очищает временные данные и сбрасывает режим.
   */
  const handleFinishEditing = useCallback(
    (overrideData?: GeoData) => {
      const sourceData = overrideData ?? tempGeoData;

      if (sourceData.features.length === 0) return;

      setSavedGeoData(prevSaved => ({
        type: "FeatureCollection",
        features: [
          ...prevSaved.features,
          ...sourceData.features.map(f => ({
            ...f,
            properties: { ...f.properties, isTemp: false },
          })),
        ],
      }));

      setTempGeoData({ type: "FeatureCollection", features: [] });
      setDrawActionType(undefined);
    },
    [tempGeoData]
  );

  /**
   * Отмена текущего редактирования.
   * - Очищает временные данные.
   * - Сбрасывает режим рисования.
   */
  const handleCancelEditing = useCallback(() => {
    setTempGeoData({ type: "FeatureCollection", features: [] });
    setDrawActionType(undefined);
  }, []);

  /**
   * Удаляет последнюю точку активной линии.
   */
  const handleDeleteLastPoint = useCallback(() => {
    const clonedGeoData = structuredClone(tempGeoData);

    const lastTempLine = [...clonedGeoData.features]
      .reverse()
      .find(f => f.geometry.type === "LineString" && f.properties?.isTemp);

    if (lastTempLine && lastTempLine.geometry.type === "LineString") {
      lastTempLine.geometry.coordinates.pop();

      if (lastTempLine.geometry.coordinates.length === 0) {
        clonedGeoData.features = clonedGeoData.features.filter(f => f !== lastTempLine);
      }

      setTempGeoData(clonedGeoData);
    }
  }, [tempGeoData]);

  // Сбрасываем редактирование при смене провайдера
  useEffect(() => {
    handleCancelEditing();
  }, [provider, handleCancelEditing]);

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
