import type { ConnectFolderItem, ExtensionConfig } from "../types";
import { getDefaultDailyDate } from "../utils/dates";

export const MOCK_CONFIG: ExtensionConfig = {
  version: 1,
  refreshIntervalSeconds: 60,
  configFolderId: "mock-field-tracking",
  configFileId: "mock-config-file",
  devices: [],
};

function localDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getDefaultDailyDate(date);
}

const today = getDefaultDailyDate();
const yesterday = localDateOffset(-1);
const FIXED_LOCAL_DAY = "2026-09-28";

const MOCK_FILES: Record<string, string> = {
  "mock-track-1": [
    `{"timestamp":"${today}T08:00:00.000Z","localDate":"${today}","utcOffsetMinutes":600,"latitude":-27.4705,"longitude":153.0260,"deviceId":"rover-1","deviceName":"Rover 1","northing":6948321.12,"easting":502341.45,"elevation":24.5,"height":24.5,"source":"gnss-receiver","appVersion":"0.2.0.0"}`,
    `{"timestamp":"${today}T08:15:00.000Z","localDate":"${today}","utcOffsetMinutes":600,"latitude":-27.4710,"longitude":153.0275,"deviceId":"rover-1","deviceName":"Rover 1","northing":6948310.88,"easting":502498.12,"elevation":24.8,"height":24.8,"source":"gnss-receiver","appVersion":"0.2.0.0"}`,
    `{"timestamp":"${today}T08:30:00.000Z","localDate":"${today}","utcOffsetMinutes":600,"latitude":-27.4718,"longitude":153.0288,"deviceId":"rover-1","deviceName":"Rover 1","northing":6948298.44,"easting":502621.77,"elevation":25.1,"height":25.1,"source":"gnss-receiver","appVersion":"0.2.0.0"}`,
  ].join("\n"),
  "mock-track-2": [
    `{"timestamp":"${today}T09:00:00.000Z","localDate":"${today}","utcOffsetMinutes":600,"latitude":-27.4698,"longitude":153.0248,"deviceId":"rover-2","deviceName":"Rover 2","northing":6948401.02,"easting":502220.11,"elevation":23.9,"height":23.9,"source":"gnss-receiver","appVersion":"0.2.0.0"}`,
    `{"timestamp":"${today}T09:20:00.000Z","localDate":"${today}","utcOffsetMinutes":600,"latitude":-27.4702,"longitude":153.0262,"deviceId":"rover-2","deviceName":"Rover 2","northing":6948388.66,"easting":502352.44,"elevation":24.0,"height":24.0,"source":"gnss-receiver","appVersion":"0.2.0.0"}`,
  ].join("\n"),
  "mock-track-yesterday": [
    `{"timestamp":"${yesterday}T10:00:00.000Z","localDate":"${yesterday}","utcOffsetMinutes":600,"latitude":-27.4725,"longitude":153.0295,"deviceId":"rover-1","deviceName":"Rover 1","northing":6948280.12,"easting":502700.01,"elevation":25.4,"height":25.4,"source":"gnss-receiver","appVersion":"0.2.0.0"}`,
  ].join("\n"),
  "mock-track-aest-boundary": [
    `{"timestamp":"2026-09-27T21:00:00.000Z","localDate":"${FIXED_LOCAL_DAY}","utcOffsetMinutes":600,"latitude":-27.4705,"longitude":153.026,"height":24.5,"deviceId":"5738R00123","deviceName":"5738R00123","northing":6948321.12,"easting":502341.45,"elevation":24.5,"source":"gnss-receiver","appVersion":"0.2.0.0"}`,
    `{"timestamp":"2026-09-27T22:05:00.000Z","localDate":"${FIXED_LOCAL_DAY}","utcOffsetMinutes":600,"latitude":-27.471,"longitude":153.0275,"height":24.8,"deviceId":"5738R00123","deviceName":"5738R00123","northing":6948310.88,"easting":502498.12,"elevation":24.8,"source":"gnss-receiver","appVersion":"0.2.0.0"}`,
    `{"timestamp":"2026-09-28T01:00:00.000Z","localDate":"${FIXED_LOCAL_DAY}","utcOffsetMinutes":600,"latitude":-27.4718,"longitude":153.0288,"height":25.1,"deviceId":"5738R00123","deviceName":"5738R00123","source":"gnss-receiver","appVersion":"0.2.0.0"}`,
  ].join("\n"),
};

const MOCK_FOLDERS: Record<string, ConnectFolderItem[]> = {
  root: [
    {
      id: "mock-field-tracking",
      name: "Field Tracking",
      type: "FOLDER",
      modifiedOn: `${today}T07:00:00.000Z`,
    },
  ],
  "mock-field-tracking": [
    {
      id: "mock-config-file",
      name: "survey-tracking-map.config.json",
      type: "FILE",
      modifiedOn: `${today}T07:05:00.000Z`,
      versionId: "v1",
    },
    {
      id: "mock-device-1",
      name: "Rover 1",
      type: "FOLDER",
      modifiedOn: `${today}T08:00:00.000Z`,
    },
    {
      id: "mock-device-2",
      name: "Rover 2",
      type: "FOLDER",
      modifiedOn: `${today}T09:00:00.000Z`,
    },
    {
      id: "mock-device-serial",
      name: "5738R00123",
      type: "FOLDER",
      modifiedOn: `${FIXED_LOCAL_DAY}T08:00:00.000Z`,
    },
  ],
  "mock-device-1": [
    {
      id: "mock-track-1",
      name: `Rover 1_${today}.jsonl`,
      type: "FILE",
      modifiedOn: `${today}T08:30:00.000Z`,
      versionId: "v1",
    },
    {
      id: "mock-track-yesterday",
      name: `Rover 1_${yesterday}.jsonl`,
      type: "FILE",
      modifiedOn: `${yesterday}T10:00:00.000Z`,
      versionId: "v1",
    },
  ],
  "mock-device-2": [
    {
      id: "mock-track-2",
      name: `Rover 2_${today}.jsonl`,
      type: "FILE",
      modifiedOn: `${today}T09:20:00.000Z`,
      versionId: "v1",
    },
  ],
  "mock-device-serial": [
    {
      id: "mock-track-aest-boundary",
      name: "5738R00123_2026-09-28.jsonl",
      type: "FILE",
      modifiedOn: "2026-09-27T22:05:00.000Z",
      versionId: "v1",
    },
  ],
};

export class MockConnectDataStore {
  private config = structuredClone(MOCK_CONFIG);

  getProject() {
    return {
      id: "mock-project",
      origin: "https://app.connect.trimble.com",
      rootId: "root",
      name: "Mock Survey Project",
      location: "Brisbane, AU",
      crs: { name: "EPSG:28356" },
    };
  }

  listFolderItems(folderId: string): ConnectFolderItem[] {
    return MOCK_FOLDERS[folderId] ?? [];
  }

  downloadTextFile(fileId: string): string {
    if (fileId === "mock-config-file") {
      return JSON.stringify(this.config, null, 2);
    }
    return MOCK_FILES[fileId] ?? "";
  }

  saveConfig(config: ExtensionConfig): ExtensionConfig {
    this.config = structuredClone(config);
    return this.config;
  }

  getObjectSyncStatus(): string {
    return `mock-sync-${Date.now()}`;
  }
}

export const mockConnectDataStore = new MockConnectDataStore();
