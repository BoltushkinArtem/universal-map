import { FC, ReactElement, useState, useEffect } from "react";
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
  tempGeoData: GeoJSON.FeatureCollection;
  savedGeoData: GeoJSON.FeatureCollection;
  onUpdateGeoData: (data: GeoJSON.FeatureCollection) => void;
}

const MapEngineWrapper: FC<MapEngineWrapperProps> = ({
  providerId,
  drawActionType,
  markerIconUrl,
  tempGeoData,
  savedGeoData,
  onUpdateGeoData,
}): ReactElement => {
  const [instanceKey, setInstanceKey] = useState(0);

  useEffect(() => setInstanceKey(prev => prev + 1), [providerId]);

  const key = `${providerId}-${instanceKey}`;

  const renderEngine = (): ReactElement | null => {
    if (providerId.startsWith("MapLibre") && !providerId.startsWith("MapLibre_ArcGIS")) {
      return (
        <MapLibreEngine
          key={key}
          providerId={providerId}
          drawActionType={drawActionType}
          markerIconUrl={markerIconUrl}
          tempGeoData={tempGeoData}
          savedGeoData={savedGeoData}
          onUpdateGeoData={onUpdateGeoData}
        />
      );
    }

    if (providerId.startsWith("MapLibre_ArcGIS")) {
      return (
        <ArcGISEngine
          key={key}
          providerId={providerId}
          drawActionType={drawActionType}
          markerIconUrl={markerIconUrl}
        />
      );
    }

    if (providerId.startsWith("Google")) {
      return (
        <GoogleEngine
          key={key}
          providerId={providerId}
          drawActionType={drawActionType}
          markerIconUrl={markerIconUrl}
        />
      );
    }

    if (providerId.startsWith("Yandex")) {
      return (
        <YandexEngine
          key={key}
          providerId={providerId}
          drawActionType={drawActionType}
          markerIconUrl={markerIconUrl}
        />
      );
    }

    return null;
  };

  return <div className={styles.wrapper}>{renderEngine()}</div>;
};

export default MapEngineWrapper;
