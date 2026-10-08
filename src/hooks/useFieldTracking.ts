import { useCallback, useEffect, useState } from "react";
import { connectClient } from "../connect/connectClient";
import { normalizeConfig } from "../config/schema";
import type { ExtensionConfig } from "../types";

/** Discovers devices under Field Tracking and keeps a lightweight shared config there. */
export function useFieldTracking(
  enabled: boolean,
  fallbackRefreshInterval: number,
) {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const discovered = await connectClient.discoverDevices(
        fallbackRefreshInterval,
      );
      setConfig(discovered);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to discover Field Tracking devices.",
      );
      setConfig(normalizeConfig(undefined, fallbackRefreshInterval));
    } finally {
      setLoading(false);
    }
  }, [enabled, fallbackRefreshInterval]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    config,
    setConfig,
    loading,
    error,
    reload: load,
  };
}
