import type { ConnectFolderItem, ExtensionConfig } from "../types";
import { CONFIG_FILE_NAME } from "../utils/constants";

export function createDefaultConfig(
  refreshIntervalSeconds = 60,
): ExtensionConfig {
  return {
    version: 1,
    refreshIntervalSeconds,
    devices: [],
  };
}

export function normalizeConfig(
  value: unknown,
  fallbackRefreshInterval = 60,
): ExtensionConfig {
  if (!value || typeof value !== "object") {
    return createDefaultConfig(fallbackRefreshInterval);
  }

  const input = value as Partial<ExtensionConfig>;
  const devices = Array.isArray(input.devices)
    ? input.devices
        .filter(
          (device): device is ExtensionConfig["devices"][number] =>
            Boolean(
              device &&
                typeof device === "object" &&
                typeof device.id === "string" &&
                typeof device.label === "string" &&
                typeof device.folderId === "string" &&
                typeof device.enabled === "boolean",
            ),
        )
        .map((device) => ({
          ...device,
          folderName: device.folderName,
        }))
    : [];

  return {
    version: 1,
    refreshIntervalSeconds:
      typeof input.refreshIntervalSeconds === "number" &&
      input.refreshIntervalSeconds >= 15
        ? input.refreshIntervalSeconds
        : fallbackRefreshInterval,
    configFolderId:
      typeof input.configFolderId === "string"
        ? input.configFolderId
        : undefined,
    configFileId:
      typeof input.configFileId === "string" ? input.configFileId : undefined,
    devices,
  };
}

export function serializeConfig(config: ExtensionConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

export function isConfigFile(item: ConnectFolderItem): boolean {
  return item.type === "FILE" && item.name === CONFIG_FILE_NAME;
}
