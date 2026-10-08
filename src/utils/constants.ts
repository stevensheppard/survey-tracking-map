export const CONFIG_FILE_NAME = "survey-tracking-map.config.json";
export const FIELD_TRACKING_FOLDER_NAME = "Field Tracking";
/** @deprecated Use FIELD_TRACKING_FOLDER_NAME */
export const CONFIG_FOLDER_NAME = FIELD_TRACKING_FOLDER_NAME;
export const DAILY_FOLDER_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const DAILY_FILE_DATE_PATTERN = /(\d{4}-\d{2}-\d{2})(?:\.jsonl)?$/i;

export function createDeviceId(): string {
  return `device-${crypto.randomUUID()}`;
}

export function isDailyFolderName(name: string): boolean {
  return DAILY_FOLDER_PATTERN.test(name);
}

/** Extract YYYY-MM-DD from names like `5738R00123_2026-09-28.jsonl`. */
export function dateKeyFromFileName(fileName: string): string | null {
  const match = fileName.match(/_(\d{4}-\d{2}-\d{2})\.jsonl$/i);
  if (match) {
    return match[1];
  }
  const bare = fileName.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/i);
  return bare ? bare[1] : null;
}

export function fileMatchesDateRange(
  fileName: string,
  startDate?: string,
  endDate?: string,
): boolean {
  if (!startDate && !endDate) {
    return fileName.toLowerCase().endsWith(".jsonl");
  }

  const dateKey = dateKeyFromFileName(fileName);
  if (!dateKey) {
    // Unknown naming: still download and filter by record localDate.
    return fileName.toLowerCase().endsWith(".jsonl");
  }

  if (startDate && dateKey < startDate) {
    return false;
  }
  if (endDate && dateKey > endDate) {
    return false;
  }
  return true;
}
