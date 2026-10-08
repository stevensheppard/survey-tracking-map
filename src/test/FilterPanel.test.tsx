import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilterPanel } from "../features/filters/FilterPanel";
import type { DeviceConfig, TrackingFilters } from "../types";

const devices: DeviceConfig[] = [
  {
    id: "device-1",
    label: "Rover 1",
    folderId: "folder-1",
    enabled: true,
  },
];

const filters: TrackingFilters = {
  mode: "daily",
  dailyDate: "2026-07-24",
  visibleDeviceIds: ["device-1"],
};

describe("FilterPanel", () => {
  it("renders the devices reporting banner and collapsible device list", () => {
    render(
      <FilterPanel
        filters={filters}
        devices={devices}
        devicesReporting={1}
        totalDevices={1}
        loading={false}
        diagnosticsCount={0}
        onFiltersChange={() => undefined}
        onRefresh={() => undefined}
      />,
    );

    expect(screen.getByText("Devices reporting")).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
    expect(screen.getByText("Visible Devices")).toBeInTheDocument();
    expect(screen.getByText("Rover 1")).toBeInTheDocument();
  });
});
