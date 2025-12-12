import { FC, ReactElement, useState, useEffect } from "react";
import MapLibreEngine from "../../engines/MapLibreEngine";
import GoogleEngine from "../../engines/GoogleEngine";
import YandexEngine from "../../engines/YandexEngine";
import ArcGISEngine from "../../engines/ArcGISEngine";
import styles from "./MapEngineWrapper.module.scss";
import { DrawActionType } from "../../engines/drawActionType";
import { GeoData } from "../../engines/geoDataType";

/**
 * Пропсы компонента MapEngineWrapper
 */
interface MapEngineWrapperProps {
  /** Идентификатор провайдера карт */
  providerId: string;

  /** Текущий режим рисования */
  drawActionType?: DrawActionType;

  /** URL иконки маркера */
  markerIconUrl?: string;

  /** Временные геоданные для рисования */
  tempGeoData: GeoData;

  /** Сохранённые геоданные */
  savedGeoData: GeoData;

  /** Колбэк при обновлении геоданных */
  onUpdateGeoData: (data: GeoData) => void;
}

/**
 * MapEngineWrapper — компонент-обёртка, выбирающий движок карты в зависимости от провайдера.
 * Поддерживает MapLibre, ArcGIS, Google и Yandex.
 */
const MapEngineWrapper: FC<MapEngineWrapperProps> = ({
  providerId,
  drawActionType,
  markerIconUrl,
  tempGeoData,
  savedGeoData,
  onUpdateGeoData,
}): ReactElement => {
  /** Состояние для перегенерации ключа при смене провайдера */
  const [instanceKey, setInstanceKey] = useState(0);

  /** Инкремент ключа при изменении провайдера для перерисовки движка */
  useEffect(() => {
    setInstanceKey((prev) => prev + 1);
  }, [providerId]);

  const key = `${providerId}-${instanceKey}`;

  /**
   * Выбирает и рендерит нужный движок карты в зависимости от провайдера
   */
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
          tempGeoData={tempGeoData}
          savedGeoData={savedGeoData}
          onUpdateGeoData={onUpdateGeoData}
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
          tempGeoData={tempGeoData}
          savedGeoData={savedGeoData}
          onUpdateGeoData={onUpdateGeoData}
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
          tempGeoData={tempGeoData}
          savedGeoData={savedGeoData}
          onUpdateGeoData={onUpdateGeoData}
        />
      );
    }

    return null;
  };

  return <div className={styles.wrapper}>{renderEngine()}</div>;
};

export default MapEngineWrapper;
