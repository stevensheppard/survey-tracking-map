import { useState } from "react";
import type { DeviceConfig, TrackingFilters } from "../../types";
import { getDefaultDailyDate } from "../../utils/dates";

interface FilterPanelProps {
  filters: TrackingFilters;
  devices: DeviceConfig[];
  devicesReporting: number;
  totalDevices: number;
  loading: boolean;
  lastUpdated?: string;
  diagnosticsCount: number;
  onFiltersChange: (filters: TrackingFilters) => void;
  onRefresh: () => void;
}

export function FilterPanel({
  filters,
  devices,
  devicesReporting,
  totalDevices,
  loading,
  lastUpdated,
  diagnosticsCount,
  onFiltersChange,
  onRefresh,
}: FilterPanelProps) {
  const [devicesExpanded, setDevicesExpanded] = useState(true);
  const allVisible =
    devices.length > 0 &&
    devices.every((device) => filters.visibleDeviceIds.includes(device.id));
  const someVisible =
    devices.some((device) => filters.visibleDeviceIds.includes(device.id)) &&
    !allVisible;

  function setAllVisible(checked: boolean) {
    onFiltersChange({
      ...filters,
      visibleDeviceIds: checked ? devices.map((device) => device.id) : [],
    });
  }

  return (
    <aside className="filter-panel">
      <header className="panel-header">
        <div>
          <h2>Map Controls</h2>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <section className="reporting-banner">
        <span className="reporting-banner__label">Devices reporting</span>
        <strong className="reporting-banner__value">
          {devicesReporting} / {totalDevices}
        </strong>
        {lastUpdated && (
          <span className="muted">
            Updated {new Date(lastUpdated).toLocaleString()}
          </span>
        )}
      </section>

      <section className="filter-section">
        <h3>Date Range</h3>
        <div className="radio-group">
          {(["all", "daily", "range"] as const).map((mode) => (
            <label key={mode} className="radio-field">
              <input
                type="radio"
                name="date-mode"
                checked={filters.mode === mode}
                onChange={() =>
                  onFiltersChange({
                    ...filters,
                    mode,
                    dailyDate: filters.dailyDate ?? getDefaultDailyDate(),
                  })
                }
              />
              {mode === "all"
                ? "All time"
                : mode === "daily"
                  ? "Daily"
                  : "Custom range"}
            </label>
          ))}
        </div>

        {filters.mode === "daily" && (
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={filters.dailyDate ?? getDefaultDailyDate()}
              onChange={(event) =>
                onFiltersChange({ ...filters, dailyDate: event.target.value })
              }
            />
          </label>
        )}

        {filters.mode === "range" && (
          <div className="field-grid">
            <label className="field">
              <span>Start date</span>
              <input
                type="date"
                value={filters.startDate ?? ""}
                onChange={(event) =>
                  onFiltersChange({ ...filters, startDate: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span>End date</span>
              <input
                type="date"
                value={filters.endDate ?? ""}
                onChange={(event) =>
                  onFiltersChange({ ...filters, endDate: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </section>

      <section className="filter-section device-layers">
        <button
          type="button"
          className="device-layers__toggle"
          onClick={() => setDevicesExpanded((value) => !value)}
          aria-expanded={devicesExpanded}
        >
          <span className="device-layers__chevron">
            {devicesExpanded ? "▾" : "▸"}
          </span>
          <label className="checkbox-field device-layers__master" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={allVisible}
              ref={(input) => {
                if (input) {
                  input.indeterminate = someVisible;
                }
              }}
              onChange={(event) => setAllVisible(event.target.checked)}
            />
            Visible Devices
          </label>
        </button>

        {devicesExpanded && (
          <div className="checkbox-list device-layers__list">
            {devices.length === 0 ? (
              <p className="muted">
                No device folders found under Field Tracking yet.
              </p>
            ) : (
              devices.map((device) => (
                <label key={device.id} className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={filters.visibleDeviceIds.includes(device.id)}
                    onChange={(event) => {
                      const visibleDeviceIds = event.target.checked
                        ? [...filters.visibleDeviceIds, device.id]
                        : filters.visibleDeviceIds.filter(
                            (id) => id !== device.id,
                          );
                      onFiltersChange({ ...filters, visibleDeviceIds });
                    }}
                  />
                  {device.label}
                </label>
              ))
            )}
          </div>
        )}
      </section>

      {diagnosticsCount > 0 && (
        <section className="filter-section">
          <h3>Diagnostics</h3>
          <p className="warning-text">
            {diagnosticsCount} malformed line(s) or skipped file(s) were detected
            in the current load.
          </p>
        </section>
      )}
    </aside>
  );
}
