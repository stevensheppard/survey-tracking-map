export function toUtcDateKey(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

export function parseIsoDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isDateInRange(
  isoTimestamp: string,
  startDate?: string,
  endDate?: string,
): boolean {
  const dateKey = toUtcDateKey(isoTimestamp);
  if (startDate && dateKey < startDate) {
    return false;
  }
  if (endDate && dateKey > endDate) {
    return false;
  }
  return true;
}

/** Prefer Access localDate; fall back to UTC date from timestamp (v1). */
export function recordDateKey(record: {
  timestamp: string;
  localDate?: string;
}): string {
  if (record.localDate && /^\d{4}-\d{2}-\d{2}$/.test(record.localDate)) {
    return record.localDate;
  }
  return toUtcDateKey(record.timestamp);
}

export function isRecordInRange(
  record: { timestamp: string; localDate?: string },
  startDate?: string,
  endDate?: string,
): boolean {
  const dateKey = recordDateKey(record);
  if (startDate && dateKey < startDate) {
    return false;
  }
  if (endDate && dateKey > endDate) {
    return false;
  }
  return true;
}

/** Browser local calendar date as YYYY-MM-DD (not UTC). */
export function getDefaultDailyDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dedupePoints(
  points: import("../types").TrackingPoint[],
): import("../types").TrackingPoint[] {
  const seen = new Set<string>();
  const unique: import("../types").TrackingPoint[] = [];

  for (const point of points) {
    const key = [
      point.deviceConfigId,
      point.timestamp,
      point.latitude,
      point.longitude,
      point.northing ?? "",
      point.easting ?? "",
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(point);
  }

  return unique.sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );
}
