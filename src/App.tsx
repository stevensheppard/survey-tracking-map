import { useEffect, useMemo, useState } from "react";
import { FilterPanel } from "./features/filters/FilterPanel";
import { TrackingMap } from "./features/map/TrackingMap";
import { useConnectWorkspace } from "./hooks/useConnectWorkspace";
import { useFieldTracking } from "./hooks/useFieldTracking";
import {
  createDefaultFilters,
  useTrackingData,
} from "./hooks/useTrackingData";
import { useRuntimeConfig } from "./hooks/useRuntimeConfig";
import type { TrackingFilters } from "./types";
import "./App.css";

function App() {
  const [basemapId, setBasemapId] = useState("streets");
  const [filters, setFilters] = useState<TrackingFilters | null>(null);

  const { project, loading, error, statusMessage, isMockMode } =
    useConnectWorkspace();
  const { config: runtimeConfig, error: runtimeError } = useRuntimeConfig();
  const {
    config,
    loading: configLoading,
    error: configError,
  } = useFieldTracking(
    Boolean(project),
    runtimeConfig?.refreshIntervalSeconds ?? 60,
  );

  const deviceIds = useMemo(
    () =>
      config?.devices
        .filter((device) => device.enabled)
        .map((device) => device.id) ?? [],
    [config],
  );

  useEffect(() => {
    if (!config) {
      return;
    }

    setFilters((current) => {
      if (!current) {
        return createDefaultFilters(deviceIds);
      }

      const retained = current.visibleDeviceIds.filter((id) =>
        deviceIds.includes(id),
      );
      const added = deviceIds.filter(
        (id) => !current.visibleDeviceIds.includes(id),
      );

      return {
        ...current,
        visibleDeviceIds: [...retained, ...added],
      };
    });
  }, [config, deviceIds]);

  const basemaps = runtimeConfig
    ? [runtimeConfig.basemaps.streets, runtimeConfig.basemaps.satellite]
    : [];
  const selectedBasemap =
    basemaps.find((basemap) => basemap.id === basemapId) ?? basemaps[0];

  const refreshInterval =
    config?.refreshIntervalSeconds ??
    runtimeConfig?.refreshIntervalSeconds ??
    60;

  const activeFilters = filters ?? createDefaultFilters(deviceIds);

  const {
    result,
    loading: tracksLoading,
    error: tracksError,
    refresh,
  } = useTrackingData(config, activeFilters, refreshInterval, true);

  const diagnosticsCount =
    result.diagnostics.malformedLines.length +
    result.diagnostics.skippedFiles.length;

  if (loading || configLoading || !runtimeConfig) {
    return (
      <div className="app-shell">
        <div className="center-state">
          <h1>Survey Tracking Map</h1>
          <p>{statusMessage}</p>
        </div>
      </div>
    );
  }

  if (error || runtimeError) {
    return (
      <div className="app-shell">
        <div className="center-state error-text">
          <h1>Survey Tracking Map</h1>
          <p>{error ?? runtimeError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Survey Tracking Map</h1>
          <p className="muted">
            {project?.name ?? "Trimble Connect Project"}
            {isMockMode ? " · Mock mode" : ""}
          </p>
        </div>
      </header>

      {configError && (
        <p className="error-text" style={{ padding: "0.5rem 1.25rem" }}>
          {configError}
        </p>
      )}

      <div className="workspace">
        {filters && (
          <FilterPanel
            filters={filters}
            devices={config?.devices.filter((device) => device.enabled) ?? []}
            devicesReporting={result.devicesReporting}
            totalDevices={
              config?.devices.filter((device) => device.enabled).length ?? 0
            }
            loading={tracksLoading}
            lastUpdated={result.lastUpdated}
            diagnosticsCount={diagnosticsCount}
            onFiltersChange={setFilters}
            onRefresh={() => void refresh()}
          />
        )}

        <div className="workspace__main">
          {tracksError && <p className="error-text">{tracksError}</p>}
          {!tracksLoading &&
            !tracksError &&
            result.tracks.every((track) => track.points.length === 0) && (
              <p className="muted" style={{ padding: "0.75rem 1.25rem" }}>
                No track points matched the current date filter. Confirm daily
                files are named{" "}
                <code>&lt;serial&gt;_YYYY-MM-DD.jsonl</code> under{" "}
                <code>Field Tracking/&lt;serial&gt;/</code> and each line
                includes latitude/longitude.
              </p>
            )}
          {selectedBasemap && (
            <TrackingMap
              tracks={result.tracks}
              basemap={selectedBasemap}
              basemaps={basemaps}
              onBasemapChange={setBasemapId}
              projectName={project?.name}
              crsName={project?.crsName}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
