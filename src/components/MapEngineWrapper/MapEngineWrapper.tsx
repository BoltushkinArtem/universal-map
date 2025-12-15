import { FC, ReactElement, useState, useEffect, useMemo } from "react";
import MapLibreEngine from "../../engines/MapLibreEngine";
import GoogleEngine from "../../engines/GoogleEngine";
import YandexEngine from "../../engines/YandexEngine";
import ArcGISEngine from "../../engines/ArcGISEngine";
import styles from "./MapEngineWrapper.module.scss";
import { DrawActionType } from "../../engines/drawActionType";
import { GeoData } from "../../engines/geoDataType";
import { getProviderConfig } from "../../utils/providers";

/**
 * Пропсы компонента MapEngineWrapper
 */
interface MapEngineWrapperProps {
    /** Идентификатор провайдера карт */
    providerId: string;

    /** Текущий режим рисования (необязательный) */
    drawActionType?: DrawActionType;

    /** URL иконки маркера (необязательный) */
    markerIconUrl?: string;

    /** Временные геоданные для рисования */
    tempGeoData: GeoData;

    /** Сохранённые геоданные */
    savedGeoData: GeoData;

    /** Колбэк при обновлении геоданных */
    onUpdateGeoData: (data: GeoData) => void;
}

/**
 * MapEngineWrapper — компонент-обёртка, выбирающий движок карты
 * в зависимости от выбранного провайдера.
 * Поддерживаются MapLibre, ArcGIS, Google и Yandex.
 */
const MapEngineWrapper: FC<MapEngineWrapperProps> = ({
    providerId,
    drawActionType,
    markerIconUrl,
    tempGeoData,
    savedGeoData,
    onUpdateGeoData,
}): ReactElement => {
    /**
     * Состояние ключа инстанса карты.
     * Используется для принудительной перерисовки движка при смене провайдера.
     */
    const [instanceKey, setInstanceKey] = useState<number>(0);

    /**
     * Эффект: инкремент ключа при смене провайдера,
     * чтобы React заново инициализировал компонент движка карты.
     */
    useEffect(() => {
        setInstanceKey(prevKey => prevKey + 1);
    }, [providerId]);

    /**
     * Уникальный ключ инстанса карты.
     * Формируется из идентификатора провайдера и счетчика инстанса.
     */
    const engineKey: string = useMemo(() => `${providerId}-${instanceKey}`, [providerId, instanceKey]);

    /**
     * Получает конфигурацию карты для текущего провайдера с кэшированием.
     */
    const mapConfig = useMemo(() => getProviderConfig(providerId), [providerId]);

    /**
     * Функция выбора и рендеринга нужного движка карты в зависимости от провайдера.
     *
     * @returns ReactElement движка карты или null, если провайдер не поддерживается
     */
    const renderEngine = (): ReactElement | null => {
        // Проверка на MapLibre без ArcGIS
        if (providerId.startsWith("MapLibre") && !providerId.startsWith("MapLibre_ArcGIS")) {
            return (
                <MapLibreEngine
                    key={engineKey}
                    providerId={providerId}
                    drawActionType={drawActionType}
                    markerIconUrl={markerIconUrl}
                    mapConfig={mapConfig}
                    tempGeoData={tempGeoData}
                    savedGeoData={savedGeoData}
                    onUpdateGeoData={onUpdateGeoData}
                />
            );
        }

        // Проверка на MapLibre с ArcGIS
        if (providerId.startsWith("MapLibre_ArcGIS")) {
            return (
                <ArcGISEngine
                    key={engineKey}
                    providerId={providerId}
                    drawActionType={drawActionType}
                    markerIconUrl={markerIconUrl}
                    mapConfig={mapConfig}
                    tempGeoData={tempGeoData}
                    savedGeoData={savedGeoData}
                    onUpdateGeoData={onUpdateGeoData}
                />
            );
        }

        // Проверка на Google Maps
        if (providerId.startsWith("Google")) {
            return (
                <GoogleEngine
                    key={engineKey}
                    providerId={providerId}
                    drawActionType={drawActionType}
                    markerIconUrl={markerIconUrl}
                    mapConfig={mapConfig}
                    tempGeoData={tempGeoData}
                    savedGeoData={savedGeoData}
                    onUpdateGeoData={onUpdateGeoData}
                />
            );
        }

        // Проверка на Yandex Maps
        if (providerId.startsWith("Yandex")) {
            return (
                <YandexEngine
                    key={engineKey}
                    providerId={providerId}
                    drawActionType={drawActionType}
                    markerIconUrl={markerIconUrl}
                    mapConfig={mapConfig}
                    tempGeoData={tempGeoData}
                    savedGeoData={savedGeoData}
                    onUpdateGeoData={onUpdateGeoData}
                />
            );
        }

        // Если провайдер не поддерживается — возвращаем null
        return null;
    };

    // Основной рендер: контейнер обёртки с динамическим движком
    return <div className={styles.wrapper}>{renderEngine()}</div>;
};

export default MapEngineWrapper;
