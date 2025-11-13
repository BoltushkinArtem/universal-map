import React, { FC, ReactElement, useState, useEffect } from "react";
import MapLibreEngine from "../../engines/MapLibreEngine";
import GoogleEngine from "../../engines/GoogleEngine";
import YandexEngine from "../../engines/YandexEngine";
import ArcGISEngine from "../../engines/ArcGISEngine";
import styles from "./MapEngineWrapper.module.scss";
import { DrawActionType } from "../../engines/drawActionType";

interface MapEngineWrapperProps {
  providerId: string;
  drawActionType?: DrawActionType;
  markerIconUrl?: string;
  tempPolylinePoints: [number, number][];
  savedPolylines: [number, number][][];
  onUpdatePoints: (points: [number, number][]) => void;
}

const MapEngineWrapper: FC<MapEngineWrapperProps> = ({
  providerId,
  drawActionType,
  markerIconUrl,
  tempPolylinePoints,
  savedPolylines,
  onUpdatePoints,
}): ReactElement => {
  const [instanceKey, setInstanceKey] = useState<number>(0);

  useEffect(() => setInstanceKey(prev => prev + 1), [providerId]);

  const renderMapEngine = (): ReactElement | null => {
    const key = `${providerId}-${instanceKey}`;
    if (providerId.startsWith("MapLibre") && !providerId.startsWith("MapLibre_ArcGIS")) {
      return (
        <MapLibreEngine
          key={key}
          providerId={providerId}
          drawActionType={drawActionType}
          markerIconUrl={markerIconUrl}
          tempPolylinePoints={tempPolylinePoints}
          savedPolylines={savedPolylines}
          onUpdatePoints={onUpdatePoints}
        />
      );
    }
    if (providerId.startsWith("MapLibre_ArcGIS")) {
      return <ArcGISEngine key={key} providerId={providerId} drawActionType={drawActionType} markerIconUrl={markerIconUrl} />;
    }
    if (providerId === "Google" || providerId === "GoogleSatellite") {
      return <GoogleEngine key={key} providerId={providerId} drawActionType={drawActionType} markerIconUrl={markerIconUrl} />;
    }
    if (providerId.startsWith("Yandex")) {
      return <YandexEngine key={key} providerId={providerId} drawActionType={drawActionType} markerIconUrl={markerIconUrl} />;
    }
    return null;
  };

  return <div className={styles.wrapper}>{renderMapEngine()}</div>;
};

export default MapEngineWrapper;
