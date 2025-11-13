import { FC, useEffect, useRef, useState, useCallback } from "react";
import maplibregl, { Map, GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { tileTemplate } from "../../utils/providers";
import styles from "./MapLibreEngine.module.scss";
import { DrawActionType } from "../drawActionType";

interface MapLibreEngineProps {
  providerId: string;
  drawActionType?: DrawActionType;
  markerIconUrl?: string;
}

const DEFAULT_CENTER: [number, number] = [37.6173, 55.7558];
const DEFAULT_ZOOM = 10;

const isWebGLAvailable = (): boolean => {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
};

const MapLibreEngine: FC<MapLibreEngineProps> = ({
  providerId,
  drawActionType,
  markerIconUrl,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const drawActionRef = useRef(drawActionType);
  const currentPolylineRef = useRef<[number, number][]>([]);
  const nextIdRef = useRef(1);

  // Все маркеры и полилинии храним в одном GeoJSON FeatureCollection
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });

  // Обновляем текущий режим рисования
  useEffect(() => {
    drawActionRef.current = drawActionType;
  }, [drawActionType]);

  // Инициализация карты
  useEffect(() => {
    if (!mapContainerRef.current || !isWebGLAvailable()) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    mapRef.current = map;

    map.on("load", () => {
      const tiles = tileTemplate(providerId);
      if (tiles?.length && !map.getSource("basemap")) {
        map.addSource("basemap", { type: "raster", tiles, tileSize: 256 });
        map.addLayer({ id: "basemap", type: "raster", source: "basemap" });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [providerId]);

  // Меняем курсор карты при активации режима рисования
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = drawActionType ? "crosshair" : "";
  }, [drawActionType]);

  // Обработка кликов по карте
  const handleMapClick = useCallback((event: MapMouseEvent) => {
    const { lng, lat } = event.lngLat;
    const coords: [number, number] = [lng, lat];

    switch (drawActionRef.current) {
      case DrawActionType.MARKER: {
        const newFeature: GeoJSON.Feature<GeoJSON.Point> = {
          type: "Feature",
          geometry: { type: "Point", coordinates: coords },
          properties: { id: nextIdRef.current++, type: "marker" },
        };
        setGeoData((prev) => ({
          ...prev,
          features: [...prev.features, newFeature],
        }));
        break;
      }
      case DrawActionType.POLYLINE: {
        currentPolylineRef.current.push(coords);
        const newLine: GeoJSON.Feature<GeoJSON.LineString> = {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [...currentPolylineRef.current] },
          properties: { id: "active-polyline", type: "polyline" },
        };
        setGeoData((prev) => ({
          ...prev,
          features: [
            ...prev.features.filter((f) => f.properties?.id !== "active-polyline"),
            newLine,
          ],
        }));
        break;
      }
      default:
        break;
    }
  }, []);

  // Подписка на клики карты
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.on("click", handleMapClick);
    return () => { map.off("click", handleMapClick)};
  }, [handleMapClick]);

  // Отрисовка всех объектов карты
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Удаляем старые маркеры DOM
    document.querySelectorAll(".custom-marker").forEach((el) => el.remove());
    document.querySelectorAll(".polyline-point").forEach((el) => el.remove());

    geoData.features.forEach((feature) => {
      if (feature.geometry.type === "Point") {
        const markerEl = document.createElement("div");
        markerEl.className = "custom-marker";
        markerEl.style.width = "32px";
        markerEl.style.height = "32px";
        markerEl.style.backgroundImage = `url(${markerIconUrl || "https://maps.google.com/mapfiles/ms/icons/red-dot.png"})`;
        markerEl.style.backgroundSize = "contain";
        markerEl.style.backgroundRepeat = "no-repeat";

        new maplibregl.Marker({ element: markerEl, draggable: true })
          .setLngLat(feature.geometry.coordinates as [number, number])
          .addTo(map);
      } else if (feature.geometry.type === "LineString") {
        const sourceId = `polyline-${feature.properties?.id}`;
        const source = map.getSource(sourceId) as GeoJSONSource | undefined;

        if (source) {
          source.setData(feature as GeoJSON.Feature<GeoJSON.LineString>);
        } else {
          map.addSource(sourceId, { type: "geojson", data: feature });
          map.addLayer({
            id: sourceId,
            type: "line",
            source: sourceId,
            paint: { "line-color": "#ff0000", "line-width": 3 },
          });
        }

        // Белые квадратики для каждой точки линии
        (feature.geometry.coordinates as [number, number][]).forEach((coord, idx) => {
          const pointId = `${sourceId}-point-${idx}`;
          if (document.querySelector(`[data-point-id="${pointId}"]`)) return;

          const pointEl = document.createElement("div");
          pointEl.className = "polyline-point";
          pointEl.dataset.pointId = pointId;
          Object.assign(pointEl.style, {
            width: "10px",
            height: "10px",
            backgroundColor: "white",
            border: "1px solid black",
            borderRadius: "2px",
            boxSizing: "border-box",
          });

          new maplibregl.Marker({ element: pointEl, draggable: false })
            .setLngLat(coord)
            .addTo(map);
        });
      }
    });
  }, [geoData, markerIconUrl]);

  // Удаление последнего маркера
  const handleRemoveLastMarker = useCallback(() => {
    setGeoData((prev) => {
      const features = [...prev.features];
      const lastMarkerIndex = features.map((f) => f.properties?.type).lastIndexOf("marker");
      if (lastMarkerIndex === -1) return prev;
      features.splice(lastMarkerIndex, 1);
      return { ...prev, features };
    });
  }, []);

  return (
    <div className={styles.mapContainer}>
      <div ref={mapContainerRef} className={styles.mapInner} />
      <button
        type="button"
        onClick={handleRemoveLastMarker}
        className={styles.removeMarkerButton}
      >
        Remove Last Marker
      </button>
    </div>
  );
};

export default MapLibreEngine;
