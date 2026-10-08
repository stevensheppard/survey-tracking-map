import type {
  ConnectFolderItem,
  DeviceConfig,
  DeviceTrack,
  ExtensionConfig,
  LoadDiagnostics,
  TrackingFilters,
  TrackingLoadResult,
  TrackingPoint,
} from "../types";
import { parseJsonlContent } from "./schema";
import { ConnectClient } from "../connect/connectClient";
import {
  dedupePoints,
  getDefaultDailyDate,
  isRecordInRange,
  toUtcDateKey,
} from "../utils/dates";
import {
  fileMatchesDateRange,
  isDailyFolderName,
} from "../utils/constants";

interface FileCacheEntry {
  versionId?: string;
  content: string;
}

export class FileContentCache {
  private readonly entries = new Map<string, FileCacheEntry>();

  get(fileId: string, versionId?: string): string | null {
    const cached = this.entries.get(fileId);
    if (!cached) {
      return null;
    }
    if (versionId && cached.versionId !== versionId) {
      return null;
    }
    return cached.content;
  }

  set(fileId: string, versionId: string | undefined, content: string): void {
    this.entries.set(fileId, { versionId, content });
  }
}

function getDateBounds(filters: TrackingFilters): {
  startDate?: string;
  endDate?: string;
} {
  if (filters.mode === "all") {
    return {};
  }

  if (filters.mode === "daily") {
    const dailyDate = filters.dailyDate ?? getDefaultDailyDate();
    return { startDate: dailyDate, endDate: dailyDate };
  }

  return {
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
}

function folderMatchesRange(
  folderName: string,
  startDate?: string,
  endDate?: string,
): boolean {
  if (!isDailyFolderName(folderName)) {
    return false;
  }

  if (!startDate && !endDate) {
    return true;
  }
  if (startDate && folderName < startDate) {
    return false;
  }
  if (endDate && folderName > endDate) {
    return false;
  }
  return true;
}

export async function loadTracksForDevices(
  client: ConnectClient,
  config: ExtensionConfig,
  filters: TrackingFilters,
  cache = new FileContentCache(),
): Promise<TrackingLoadResult> {
  const diagnostics: LoadDiagnostics = {
    malformedLines: [],
    skippedFiles: [],
  };

  const { startDate, endDate } = getDateBounds(filters);
  const enabledDevices = config.devices.filter(
    (device) =>
      device.enabled && filters.visibleDeviceIds.includes(device.id),
  );

  const tracks: DeviceTrack[] = [];

  for (const device of enabledDevices) {
    const points = await loadDevicePoints(
      client,
      device,
      cache,
      diagnostics,
      startDate,
      endDate,
    );

    const deduped = dedupePoints(points);
    tracks.push({
      device,
      points: deduped,
      latestPoint: deduped[deduped.length - 1],
      reportingInRange: deduped.length > 0,
    });
  }

  return {
    tracks,
    devicesReporting: tracks.filter((track) => track.reportingInRange).length,
    diagnostics,
    lastUpdated: new Date().toISOString(),
  };
}

async function loadDevicePoints(
  client: ConnectClient,
  device: DeviceConfig,
  cache: FileContentCache,
  diagnostics: LoadDiagnostics,
  startDate?: string,
  endDate?: string,
): Promise<TrackingPoint[]> {
  const deviceItems = await client.listFolderItems(device.folderId);
  const points: TrackingPoint[] = [];

  const flatJsonlFiles = deviceItems.filter(
    (item) =>
      item.type === "FILE" &&
      item.name.toLowerCase().endsWith(".jsonl") &&
      fileMatchesDateRange(item.name, startDate, endDate),
  );

  for (const file of flatJsonlFiles) {
    const filePoints = await parseJsonlFile(
      client,
      device,
      file,
      cache,
      diagnostics,
      startDate,
      endDate,
    );
    points.push(...filePoints);
  }

  // Legacy v2.1 layout: device/YYYY-MM-DD/*.jsonl
  const dailyFolders = deviceItems.filter(
    (item) =>
      item.type === "FOLDER" && folderMatchesRange(item.name, startDate, endDate),
  );

  for (const dailyFolder of dailyFolders) {
    const files = await client.listFolderItems(dailyFolder.id);
    const jsonlFiles = files.filter(
      (item) => item.type === "FILE" && item.name.toLowerCase().endsWith(".jsonl"),
    );

    for (const file of jsonlFiles) {
      const filePoints = await parseJsonlFile(
        client,
        device,
        file,
        cache,
        diagnostics,
        startDate,
        endDate,
        `${device.label}/${dailyFolder.name}`,
      );
      points.push(...filePoints);
    }
  }

  return points;
}

async function parseJsonlFile(
  client: ConnectClient,
  device: DeviceConfig,
  file: ConnectFolderItem,
  cache: FileContentCache,
  diagnostics: LoadDiagnostics,
  startDate?: string,
  endDate?: string,
  pathPrefix = device.label,
): Promise<TrackingPoint[]> {
  const points: TrackingPoint[] = [];

  try {
    const content =
      cache.get(file.id, file.versionId) ??
      (await client.downloadTextFile(file.id));

    cache.set(file.id, file.versionId, content);
    const parsed = parseJsonlContent(content);

    parsed.errors.forEach((error) => {
      diagnostics.malformedLines.push({
        deviceLabel: device.label,
        fileName: file.name,
        lineNumber: error.lineNumber,
        message: error.message,
      });
    });

    parsed.records.forEach((record, index) => {
      if (!isRecordInRange(record, startDate, endDate)) {
        return;
      }

      points.push({
        ...record,
        deviceConfigId: device.id,
        deviceLabel: device.label,
        sourceFileId: file.id,
        sourceFileName: file.name,
        lineNumber: index + 1,
      });
    });
  } catch (error) {
    diagnostics.skippedFiles.push(
      `${pathPrefix}/${file.name}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }

  return points;
}

export function listDailyFolders(items: ConnectFolderItem[]): ConnectFolderItem[] {
  return items.filter(
    (item) => item.type === "FOLDER" && isDailyFolderName(item.name),
  );
}

export function filterPointsByDate(
  points: TrackingPoint[],
  filters: TrackingFilters,
): TrackingPoint[] {
  const { startDate, endDate } = getDateBounds(filters);
  return points.filter((point) => isRecordInRange(point, startDate, endDate));
}

/** @deprecated Use filterPointsByDate */
export function filterPointsByTimestamp(
  points: TrackingPoint[],
  filters: TrackingFilters,
): TrackingPoint[] {
  return filterPointsByDate(points, filters);
}

export function countReportingDevices(tracks: DeviceTrack[]): number {
  return tracks.filter((track) => track.reportingInRange).length;
}

export function toUtcDateKeyFromTimestamp(timestamp: string): string {
  return toUtcDateKey(timestamp);
}
