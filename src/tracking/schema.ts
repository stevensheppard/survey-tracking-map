import type { TrackingRecord } from "../types";

export interface ParseLineResult {
  ok: true;
  record: TrackingRecord;
}

export interface ParseLineError {
  ok: false;
  message: string;
}

export type LineParseResult = ParseLineResult | ParseLineError;

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseTrackingLine(line: string): LineParseResult {
  const trimmed = line.trim();
  if (!trimmed) {
    return { ok: false, message: "Empty line" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, message: "Invalid JSON" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, message: "Expected a JSON object" };
  }

  const record = parsed as Record<string, unknown>;
  const timestamp = record.timestamp;
  const latitude = record.latitude;
  const longitude = record.longitude;

  if (typeof timestamp !== "string" || Number.isNaN(Date.parse(timestamp))) {
    return { ok: false, message: "timestamp must be an ISO-8601 UTC string" };
  }

  if (!isFiniteNumber(latitude) || latitude < -90 || latitude > 90) {
    return { ok: false, message: "latitude must be a number between -90 and 90" };
  }

  if (!isFiniteNumber(longitude) || longitude < -180 || longitude > 180) {
    return {
      ok: false,
      message: "longitude must be a number between -180 and 180",
    };
  }

  const normalized: TrackingRecord = {
    timestamp,
    latitude,
    longitude,
  };

  if (typeof record.deviceId === "string") {
    normalized.deviceId = record.deviceId;
  }
  if (typeof record.deviceName === "string") {
    normalized.deviceName = record.deviceName;
  }
  if (isFiniteNumber(record.northing)) {
    normalized.northing = record.northing;
  }
  if (isFiniteNumber(record.easting)) {
    normalized.easting = record.easting;
  }
  if (isFiniteNumber(record.elevation)) {
    normalized.elevation = record.elevation;
  }
  if (
    typeof record.localDate === "string" &&
    LOCAL_DATE_PATTERN.test(record.localDate)
  ) {
    normalized.localDate = record.localDate;
  }
  if (isFiniteNumber(record.utcOffsetMinutes)) {
    normalized.utcOffsetMinutes = record.utcOffsetMinutes;
  }
  if (isFiniteNumber(record.height)) {
    normalized.height = record.height;
  }
  if (typeof record.source === "string") {
    normalized.source = record.source;
  }
  if (typeof record.appVersion === "string") {
    normalized.appVersion = record.appVersion;
  }

  return { ok: true, record: normalized };
}

export function parseJsonlContent(content: string): {
  records: TrackingRecord[];
  errors: Array<{ lineNumber: number; message: string }>;
} {
  const records: TrackingRecord[] = [];
  const errors: Array<{ lineNumber: number; message: string }> = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (!line.trim()) {
      return;
    }

    const result = parseTrackingLine(line);
    if (result.ok) {
      records.push(result.record);
      return;
    }

    errors.push({
      lineNumber: index + 1,
      message: result.message,
    });
  });

  return { records, errors };
}
