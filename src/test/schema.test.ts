import { describe, expect, it } from "vitest";
import { parseJsonlContent, parseTrackingLine } from "../tracking/schema";

describe("tracking schema", () => {
  it("accepts a valid tracking record", () => {
    const result = parseTrackingLine(
      '{"timestamp":"2026-07-24T08:00:00.000Z","latitude":-27.47,"longitude":153.02,"northing":100,"easting":200}',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.latitude).toBe(-27.47);
      expect(result.record.northing).toBe(100);
    }
  });

  it("keeps valid v2.1 optional fields", () => {
    const result = parseTrackingLine(
      '{"timestamp":"2026-09-27T22:05:00.000Z","localDate":"2026-09-28","utcOffsetMinutes":600,"latitude":-27.471,"longitude":153.0275,"height":24.8,"source":"gnss-receiver","appVersion":"0.2.0.0"}',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.localDate).toBe("2026-09-28");
      expect(result.record.utcOffsetMinutes).toBe(600);
      expect(result.record.height).toBe(24.8);
      expect(result.record.source).toBe("gnss-receiver");
      expect(result.record.appVersion).toBe("0.2.0.0");
    }
  });

  it("drops invalid optional fields without failing the line", () => {
    const result = parseTrackingLine(
      '{"timestamp":"2026-09-27T22:05:00.000Z","localDate":"28-09-2026","utcOffsetMinutes":"600","latitude":-27.471,"longitude":153.0275,"height":"tall","source":12,"appVersion":true}',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.localDate).toBeUndefined();
      expect(result.record.utcOffsetMinutes).toBeUndefined();
      expect(result.record.height).toBeUndefined();
      expect(result.record.source).toBeUndefined();
      expect(result.record.appVersion).toBeUndefined();
    }
  });

  it("rejects records without WGS84 coordinates", () => {
    const result = parseTrackingLine(
      '{"timestamp":"2026-07-24T08:00:00.000Z","northing":100,"easting":200}',
    );

    expect(result.ok).toBe(false);
  });

  it("parses jsonl independently and keeps valid lines", () => {
    const content = [
      '{"timestamp":"2026-07-24T08:00:00.000Z","latitude":-27.47,"longitude":153.02}',
      "not-json",
      '{"timestamp":"2026-07-24T08:15:00.000Z","latitude":-27.48,"longitude":153.03}',
    ].join("\n");

    const parsed = parseJsonlContent(content);
    expect(parsed.records).toHaveLength(2);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0].lineNumber).toBe(2);
  });
});
