import React, { FC, ReactElement, useEffect, useState } from "react";
import MapLibreEngine from "../engines/MapLibreEngine";
import GoogleEngine from "../engines/GoogleEngine";
import YandexEngine from "../engines/YandexEngine";
import ArcGISEngine from "../engines/ArcGISEngine";

import styles from "./MapEngineWrapper.module.scss";

interface MapEngineWrapperProps {
  /** Идентификатор провайдера карты */
  providerId: string;
  /** Включает возможность добавления маркеров по клику */
  drawMarkerOn?: boolean;
  /** URL кастомной иконки маркера */
  markerIconUrl?: string;
}

/**
 * MapEngineWrapper выбирает нужный движок карты в зависимости от providerId
 * и управляет его уникальным ключом, чтобы корректно обновлять компонент при смене провайдера.
 */
const MapEngineWrapper: FC<MapEngineWrapperProps> = ({
  providerId,
  drawMarkerOn = false,
  markerIconUrl,
}): ReactElement => {
  // Ключ для принудительного пересоздания движка при смене провайдера
  const [instanceKey, setInstanceKey] = useState<number>(0);

  useEffect(() => {
    setInstanceKey((prevKey) => prevKey + 1);
  }, [providerId]);

  /**
   * Выбирает и возвращает нужный компонент движка карты
   */
  const renderMapEngine = (): ReactElement | null => {
    const key = `${providerId}-${instanceKey}`;

    if (providerId.startsWith("MapLibre") && !providerId.startsWith("MapLibre_ArcGIS")) {
      return (
        <MapLibreEngine
          key={key}
          providerId={providerId}
          drawMarkerOn={drawMarkerOn}
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
          markerIconUrl={markerIconUrl}
        />
      );
    }

    return null;
  };

  return <div className={styles.wrapper}>{renderMapEngine()}</div>;
};

export default MapEngineWrapper;
