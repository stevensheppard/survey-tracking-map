import { describe, expect, it } from "vitest";
import { connectClient } from "../connect/connectClient";
import { loadTracksForDevices } from "../tracking/loadTracks";
import { createDefaultFilters } from "../hooks/useTrackingData";
import { getDefaultDailyDate } from "../utils/dates";
import { dateKeyFromFileName, fileMatchesDateRange } from "../utils/constants";

describe("flat daily file helpers", () => {
  it("extracts the local date from Access file names", () => {
    expect(dateKeyFromFileName("5738R00123_2026-09-28.jsonl")).toBe(
      "2026-09-28",
    );
    expect(dateKeyFromFileName("track.jsonl")).toBeNull();
  });

  it("filters flat files by date range", () => {
    expect(
      fileMatchesDateRange("5738R00123_2026-09-28.jsonl", "2026-09-28", "2026-09-28"),
    ).toBe(true);
    expect(
      fileMatchesDateRange("5738R00123_2026-09-27.jsonl", "2026-09-28", "2026-09-28"),
    ).toBe(false);
  });
});

describe("loadTracks", () => {
  it("discovers devices under Field Tracking and loads today's flat files", async () => {
    connectClient.enableMockMode(true);
    const config = await connectClient.discoverDevices(60);
    const todayDevices = config.devices.filter(
      (device) => device.folderName !== "5738R00123",
    );

    const result = await loadTracksForDevices(
      connectClient,
      { ...config, devices: todayDevices },
      {
        ...createDefaultFilters(todayDevices.map((device) => device.id)),
        dailyDate: getDefaultDailyDate(),
      },
    );

    expect(todayDevices.length).toBeGreaterThan(0);
    expect(result.tracks.length).toBeGreaterThan(0);
    expect(result.devicesReporting).toBeGreaterThan(0);
  });

  it("keeps pre-10:00 AEST points when filtering by localDate", async () => {
    connectClient.enableMockMode(true);
    const config = await connectClient.discoverDevices(60);
    const serialDevice = config.devices.find(
      (device) => device.folderName === "5738R00123",
    );
    expect(serialDevice).toBeDefined();

    const result = await loadTracksForDevices(
      connectClient,
      { ...config, devices: [serialDevice!] },
      {
        mode: "daily",
        dailyDate: "2026-09-28",
        visibleDeviceIds: [serialDevice!.id],
      },
    );

    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].points.length).toBeGreaterThanOrEqual(2);
    expect(
      result.tracks[0].points.some(
        (point) => point.timestamp === "2026-09-27T21:00:00.000Z",
      ),
    ).toBe(true);
    expect(result.devicesReporting).toBe(1);
  });

  it("still loads older flat daily files by local date", async () => {
    connectClient.enableMockMode(true);
    const config = await connectClient.discoverDevices(60);
    const rover1 = config.devices.find((device) => device.folderName === "Rover 1");
    expect(rover1).toBeDefined();

    const yesterday = (() => {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return getDefaultDailyDate(date);
    })();

    const result = await loadTracksForDevices(
      connectClient,
      { ...config, devices: [rover1!] },
      {
        mode: "daily",
        dailyDate: yesterday,
        visibleDeviceIds: [rover1!.id],
      },
    );

    expect(result.tracks[0].points.length).toBeGreaterThan(0);
  });
});
