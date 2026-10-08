import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import type { BasemapConfig, DeviceTrack } from "../../types";
import { colorForDevice } from "../../utils/colors";

interface TrackingMapProps {
  tracks: DeviceTrack[];
  basemap: BasemapConfig;
  basemaps: BasemapConfig[];
  onBasemapChange: (basemapId: string) => void;
  projectName?: string;
  crsName?: string;
}

function buildGeoJson(tracks: DeviceTrack[]) {
  const features = tracks.flatMap((track) => {
    const coordinates = track.points.map((point) => [
      point.longitude,
      point.latitude,
    ]);

    const line =
      coordinates.length > 1
        ? {
            type: "Feature" as const,
            properties: {
              deviceId: track.device.id,
              deviceLabel: track.device.label,
              color: colorForDevice(track.device.id),
            },
            geometry: {
              type: "LineString" as const,
              coordinates,
            },
          }
        : null;

    const points = track.points.map((point) => ({
      type: "Feature" as const,
      properties: {
        deviceId: track.device.id,
        deviceLabel: track.device.label,
        timestamp: point.timestamp,
        localDate: point.localDate,
        height: point.height,
        source: point.source,
        northing: point.northing,
        easting: point.easting,
        elevation: point.elevation,
        color: colorForDevice(track.device.id),
        isLatest: point === track.latestPoint,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [point.longitude, point.latitude],
      },
    }));

    return line ? [line, ...points] : points;
  });

  return {
    type: "FeatureCollection" as const,
    features,
  };
}

export function TrackingMap({
  tracks,
  basemap,
  basemaps,
  onBasemapChange,
  projectName,
  crsName,
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const geojson = useMemo(() => buildGeoJson(tracks), [tracks]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          basemap: {
            type: "raster",
            tiles: basemap.tiles,
            tileSize: 256,
            attribution: basemap.attribution,
            maxzoom: basemap.maxZoom,
          },
        },
        layers: [
          {
            id: "basemap",
            type: "raster",
            source: "basemap",
          },
        ],
      },
      center: [153.026, -27.4705],
      zoom: 13,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: false }),
      "bottom-right",
    );

    map.on("load", () => {
      map.addSource("tracks", {
        type: "geojson",
        data: buildGeoJson([]),
      });

      map.addLayer({
        id: "track-lines",
        type: "line",
        source: "tracks",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": ["get", "color"],
          "line-width": 3,
        },
      });

      map.addLayer({
        id: "track-points",
        type: "circle",
        source: "tracks",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "case",
            ["boolean", ["get", "isLatest"], false],
            8,
            4,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
        },
      });

      map.on("click", "track-points", (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") {
          return;
        }

        const properties = feature.properties ?? {};
        const coordinates = feature.geometry.coordinates.slice() as [
          number,
          number,
        ];
        const details: string[] = [String(properties.timestamp ?? "")];
        if (properties.localDate) {
          details.push(`Local date: ${properties.localDate}`);
        }
        if (properties.height !== undefined && properties.height !== null) {
          details.push(`Height: ${properties.height}`);
        }
        if (properties.source) {
          details.push(`Source: ${properties.source}`);
        }
        if (properties.northing && properties.easting) {
          details.push(`Grid: ${properties.northing}, ${properties.easting}`);
        }

        new maplibregl.Popup()
          .setLngLat(coordinates)
          .setHTML(
            `<strong>${properties.deviceLabel}</strong><br/>${details.join("<br/>")}`,
          )
          .addTo(map);
      });

      map.on("mouseenter", "track-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "track-points", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Intentionally create the map once; basemap swaps update the raster source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    if (map.getSource("basemap")) {
      map.removeLayer("basemap");
      map.removeSource("basemap");
    }

    map.addSource("basemap", {
      type: "raster",
      tiles: basemap.tiles,
      tileSize: 256,
      attribution: basemap.attribution,
      maxzoom: basemap.maxZoom,
    });
    map.addLayer(
      {
        id: "basemap",
        type: "raster",
        source: "basemap",
      },
      map.getLayer("track-lines") ? "track-lines" : undefined,
    );
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const updateData = () => {
      const source = map.getSource("tracks") as GeoJSONSource | undefined;
      source?.setData(geojson);

      const bounds = new maplibregl.LngLatBounds();
      geojson.features.forEach((feature) => {
        if (feature.geometry.type === "Point") {
          bounds.extend(feature.geometry.coordinates as [number, number]);
        }
        if (feature.geometry.type === "LineString") {
          feature.geometry.coordinates.forEach((coordinate) => {
            bounds.extend(coordinate as [number, number]);
          });
        }
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 48, maxZoom: 16 });
      }
    };

    if (map.isStyleLoaded()) {
      updateData();
      return;
    }

    map.once("load", updateData);
  }, [geojson]);

  return (
    <div className="map-panel">
      <header className="map-panel__header">
        <div>
          <h2>{projectName ?? "Survey Tracking Map"}</h2>
          <p className="muted">
            CRS: {crsName ?? "No project coordinate system defined"}
          </p>
        </div>
      </header>
      <div className="map-panel__stage">
        <div ref={containerRef} className="map-panel__canvas" />
        <div className="basemap-control">
          <button
            type="button"
            className="basemap-control__button"
            aria-label="Choose basemap"
            aria-expanded={layerMenuOpen}
            onClick={() => setLayerMenuOpen((open) => !open)}
          >
            <span className="basemap-control__icon" aria-hidden>
              ▦
            </span>
          </button>
          {layerMenuOpen && (
            <div className="basemap-control__menu">
              {basemaps.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={
                    option.id === basemap.id
                      ? "basemap-control__option active"
                      : "basemap-control__option"
                  }
                  onClick={() => {
                    onBasemapChange(option.id);
                    setLayerMenuOpen(false);
                  }}
                >
                  {option.label === "Map" ? "Street" : option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
