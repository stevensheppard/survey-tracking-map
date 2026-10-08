export interface BasemapConfig {
  id: string;
  label: string;
  type: "raster";
  tiles: string[];
  attribution: string;
  maxZoom: number;
}

export interface RuntimeConfig {
  refreshIntervalSeconds: number;
  basemaps: {
    streets: BasemapConfig;
    satellite: BasemapConfig;
  };
}

export interface ConnectProjectContext {
  id: string;
  name?: string;
  crsName?: string;
  crsCsib64?: string;
  location?: string;
}

export interface DeviceConfig {
  id: string;
  label: string;
  folderId: string;
  folderName?: string;
  enabled: boolean;
}

export interface ExtensionConfig {
  version: 1;
  refreshIntervalSeconds: number;
  configFolderId?: string;
  configFileId?: string;
  devices: DeviceConfig[];
}

export interface TrackingRecord {
  timestamp: string;
  latitude: number;
  longitude: number;
  deviceId?: string;
  deviceName?: string;
  northing?: number;
  easting?: number;
  elevation?: number;
  localDate?: string;
  utcOffsetMinutes?: number;
  height?: number;
  source?: string;
  appVersion?: string;
}

export interface TrackingPoint extends TrackingRecord {
  deviceConfigId: string;
  deviceLabel: string;
  sourceFileId: string;
  sourceFileName: string;
  lineNumber: number;
}

export type DateFilterMode = "all" | "daily" | "range";

export interface TrackingFilters {
  mode: DateFilterMode;
  dailyDate?: string;
  startDate?: string;
  endDate?: string;
  visibleDeviceIds: string[];
}

export interface DeviceTrack {
  device: DeviceConfig;
  points: TrackingPoint[];
  latestPoint?: TrackingPoint;
  reportingInRange: boolean;
}

export interface LoadDiagnostics {
  malformedLines: Array<{
    deviceLabel: string;
    fileName: string;
    lineNumber: number;
    message: string;
  }>;
  skippedFiles: string[];
}

export interface TrackingLoadResult {
  tracks: DeviceTrack[];
  devicesReporting: number;
  diagnostics: LoadDiagnostics;
  lastUpdated: string;
}

export interface ConnectFolderItem {
  id: string;
  name: string;
  type: "FILE" | "FOLDER";
  modifiedOn?: string;
  versionId?: string;
  parentId?: string;
}
