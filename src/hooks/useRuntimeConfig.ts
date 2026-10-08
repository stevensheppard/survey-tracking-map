import { useEffect, useState } from "react";
import type { RuntimeConfig } from "../types";

export function useRuntimeConfig() {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("./runtime-config.json");
        if (!response.ok) {
          throw new Error(`Failed to load runtime config (${response.status})`);
        }
        const payload = (await response.json()) as RuntimeConfig;
        if (!cancelled) {
          setConfig(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load runtime configuration.",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, error };
}
