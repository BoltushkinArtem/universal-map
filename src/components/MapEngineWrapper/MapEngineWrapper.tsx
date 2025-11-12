import React, { FC, ReactElement, useEffect, useState } from "react";
import MapLibreEngine from "../../engines/MapLibreEngine";
import GoogleEngine from "../../engines/GoogleEngine";
import YandexEngine from "../../engines/YandexEngine";
import ArcGISEngine from "../../engines/ArcGISEngine";
import styles from "./MapEngineWrapper.module.scss";

interface MapEngineWrapperProps {
  providerId: string;
  drawMarkerOn?: boolean;
  drawPolylineOn?: boolean;
  markerIconUrl?: string;
}

const MapEngineWrapper: FC<MapEngineWrapperProps> = ({
  providerId,
  drawMarkerOn = false,
  drawPolylineOn = false,
  markerIconUrl,
}): ReactElement => {
  const [instanceKey, setInstanceKey] = useState<number>(0);

  useEffect(() => setInstanceKey((prev) => prev + 1), [providerId]);

  const renderMapEngine = (): ReactElement | null => {
    const key = `${providerId}-${instanceKey}`;
    if (providerId.startsWith("MapLibre") && !providerId.startsWith("MapLibre_ArcGIS")) {
      return (
        <MapLibreEngine
          key={key}
          providerId={providerId}
          drawMarkerOn={drawMarkerOn}
          drawPolylineOn={drawPolylineOn}
          markerIconUrl={markerIconUrl}
        />
      );
    }
    if (providerId.startsWith("MapLibre_ArcGIS")) {
      return (
        <ArcGISEngine
          key={key}
          providerId={providerId}
          drawMarkerOn={drawMarkerOn}
          drawPolylineOn={drawPolylineOn}
          markerIconUrl={markerIconUrl}
        />
      );
    }
    if (providerId === "Google" || providerId === "GoogleSatellite") {
      return (
        <GoogleEngine
          key={key}
          providerId={providerId}
          drawMarkerOn={drawMarkerOn}
          drawPolylineOn={drawPolylineOn}
          markerIconUrl={markerIconUrl}
        />
      );
    }
    if (providerId.startsWith("Yandex")) {
      return (
        <YandexEngine
          key={key}
          providerId={providerId}
          drawMarkerOn={drawMarkerOn}
          drawPolylineOn={drawPolylineOn}
          markerIconUrl={markerIconUrl}
        />
      );
    }
    return null;
  };

  return <div className={styles.wrapper}>{renderMapEngine()}</div>;
};

export default MapEngineWrapper;
