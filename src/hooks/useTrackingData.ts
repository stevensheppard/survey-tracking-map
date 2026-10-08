import { useCallback, useEffect, useRef, useState } from "react";
import { connectClient } from "../connect/connectClient";
import {
  FileContentCache,
  loadTracksForDevices,
} from "../tracking/loadTracks";
import { TrackingSyncCoordinator } from "../tracking/sync";
import type {
  ExtensionConfig,
  TrackingFilters,
  TrackingLoadResult,
} from "../types";
import { getDefaultDailyDate } from "../utils/dates";

const EMPTY_RESULT: TrackingLoadResult = {
  tracks: [],
  devicesReporting: 0,
  diagnostics: { malformedLines: [], skippedFiles: [] },
  lastUpdated: "",
};

export function useTrackingData(
  config: ExtensionConfig | null,
  filters: TrackingFilters,
  refreshIntervalSeconds: number,
  enabled: boolean,
) {
  const [result, setResult] = useState<TrackingLoadResult>(EMPTY_RESULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef(new FileContentCache());
  const syncRef = useRef(new TrackingSyncCoordinator(connectClient));
  const refreshInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled || !config || config.devices.length === 0) {
      setResult(EMPTY_RESULT);
      setLoading(false);
      return;
    }

    if (refreshInFlight.current) {
      return;
    }

    refreshInFlight.current = true;
    setLoading(true);
    setError(null);

    try {
      const nextResult = await loadTracksForDevices(
        connectClient,
        config,
        filters,
        cacheRef.current,
      );
      setResult(nextResult);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load tracking data.",
      );
    } finally {
      refreshInFlight.current = false;
      setLoading(false);
    }
  }, [config, enabled, filters]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !config) {
      return;
    }

    const interval = window.setInterval(() => {
      void (async () => {
        const changedIds = await syncRef.current.getChangedFileIds();
        // Object Sync unavailable: fall back to a full refresh on the interval.
        // Empty array means no changes since last status.
        if (changedIds === null || changedIds.length > 0) {
          await refresh();
        }
      })();
    }, Math.max(refreshIntervalSeconds, 15) * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [config, enabled, refresh, refreshIntervalSeconds]);

  return {
    result,
    loading,
    error,
    refresh,
  };
}

export function createDefaultFilters(deviceIds: string[]): TrackingFilters {
  return {
    mode: "daily",
    dailyDate: getDefaultDailyDate(),
    visibleDeviceIds: deviceIds,
  };
}
