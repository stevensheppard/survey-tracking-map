import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dedupePoints,
  getDefaultDailyDate,
  isDateInRange,
  isRecordInRange,
  recordDateKey,
  toUtcDateKey,
} from "../utils/dates";

describe("date utilities", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("extracts UTC date keys", () => {
    expect(toUtcDateKey("2026-07-24T23:59:59.000Z")).toBe("2026-07-24");
  });

  it("filters timestamps by inclusive date range", () => {
    expect(
      isDateInRange("2026-07-24T10:00:00.000Z", "2026-07-23", "2026-07-24"),
    ).toBe(true);
    expect(
      isDateInRange("2026-07-22T10:00:00.000Z", "2026-07-23", "2026-07-24"),
    ).toBe(false);
  });

  it("prefers localDate for recordDateKey and falls back to UTC", () => {
    expect(
      recordDateKey({
        timestamp: "2026-09-27T22:00:00.000Z",
        localDate: "2026-09-28",
      }),
    ).toBe("2026-09-28");
    expect(recordDateKey({ timestamp: "2026-09-27T22:00:00.000Z" })).toBe(
      "2026-09-27",
    );
  });

  it("filters records by localDate across the UTC midnight boundary", () => {
    const earlyLocalMorning = {
      timestamp: "2026-09-27T22:00:00.000Z",
      localDate: "2026-09-28",
    };

    expect(isRecordInRange(earlyLocalMorning, "2026-09-28", "2026-09-28")).toBe(
      true,
    );
    expect(isRecordInRange(earlyLocalMorning, "2026-09-27", "2026-09-27")).toBe(
      false,
    );
  });

  it("builds default daily date from the browser local calendar", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T22:30:00.000Z"));

    const expected = (() => {
      const now = new Date("2026-09-27T22:30:00.000Z");
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    })();

    expect(getDefaultDailyDate()).toBe(expected);
  });

  it("deduplicates identical points", () => {
    const points = [
      {
        timestamp: "2026-07-24T08:00:00.000Z",
        latitude: 1,
        longitude: 2,
        deviceConfigId: "a",
        deviceLabel: "A",
        sourceFileId: "f1",
        sourceFileName: "track.jsonl",
        lineNumber: 1,
      },
      {
        timestamp: "2026-07-24T08:00:00.000Z",
        latitude: 1,
        longitude: 2,
        deviceConfigId: "a",
        deviceLabel: "A",
        sourceFileId: "f1",
        sourceFileName: "track.jsonl",
        lineNumber: 2,
      },
    ];

    expect(dedupePoints(points)).toHaveLength(1);
  });
});
