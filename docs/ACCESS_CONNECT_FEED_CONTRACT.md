# Access → Connect Feed Contract

**Contract version:** 2.2  
**Consuming app:** Survey Tracking Map (Trimble Connect extension)  
**Producing app:** Trimble Access custom app (User Tracking, field position feed)

This document is the shared interface between the Trimble Access app and the Connect extension. Keep both workspace copies identical. If either side needs a breaking change, bump the contract version and update both apps.

### What changed in 2.2

| Area | 2.1 | 2.2 |
|------|-----|-----|
| Daily layout | Device folder → `YYYY-MM-DD/` subfolder → jsonl | **Device folder → flat daily jsonl files** (no date subfolders) |
| Extension setup | User picks device folders in Configuration | Extension **auto-ensures** `Field Tracking` and **auto-discovers** device subfolders |
| Config file | Optional / user-chosen location | Auto-managed in `Field Tracking/survey-tracking-map.config.json` |
| Extension UI | Map + Configuration | **Map only** (basemap control on the map; device layer list in the side panel) |

---

## 1. Roles

| Side | Responsibility |
|------|----------------|
| **Trimble Access app** | Create device folders under `Field Tracking`, write/upload daily `.jsonl` files |
| **Survey Tracking Map** | Ensure `Field Tracking` exists, discover device folders, load daily files, plot tracks |

The Access app writes tracking data. The Connect extension only reads tracking files (plus its own auto-managed config file).

---

## 2. Folder layout (2.2)

```text
<Connect project root>/
  Field Tracking/                          ← created by Access and/or the extension
    survey-tracking-map.config.json        ← extension-managed (do not edit from Access)
    5738R00123/                            ← device folder = sanitised controller serial
      5738R00123_2026-09-28.jsonl          ← one file per local day
      5738R00123_2026-09-29.jsonl
    5821R00456/
      5821R00456_2026-09-28.jsonl
```

### Rules

| Rule | Value |
|------|--------|
| Root folder | `Field Tracking` directly under the project root |
| Device folder name | Controller serial number, sanitised (§6) |
| Daily folders | **Do not create** `YYYY-MM-DD` subfolders under the device folder |
| Tracking file name | `<device folder>_<YYYY-MM-DD>.jsonl` using the device **local** date |
| Tracking file extension | `.jsonl` |
| Multiple files per device | One file per local day; all `.jsonl` files in the device folder are considered |
| Nested folders under a device folder | Ignored for new writes; the extension may still read legacy `YYYY-MM-DD/` subfolders if present |

### Migration from 2.1

Access 0.2.x wrote:

```text
Field Tracking/<serial>/<YYYY-MM-DD>/<serial>_<YYYY-MM-DD>.jsonl
```

From contract 2.2, write:

```text
Field Tracking/<serial>/<serial>_<YYYY-MM-DD>.jsonl
```

Existing dated subfolders can remain; the extension still loads them for compatibility. New uploads should be flat.

---

## 3. File format: JSONL

Unchanged from 2.1:

- UTF-8, no BOM
- One JSON object per line
- Required: `timestamp` (UTC ISO-8601 with `Z`), `latitude`, `longitude`
- Strongly recommended: `localDate` (`YYYY-MM-DD` device local date), `utcOffsetMinutes`, `deviceId`, `deviceName`
- Optional: `height`, `northing`, `easting`, `elevation`, `source`, `appVersion`

### Example (`Field Tracking/5738R00123/5738R00123_2026-09-28.jsonl`)

```jsonl
{"timestamp":"2026-09-27T22:00:00.000Z","localDate":"2026-09-28","utcOffsetMinutes":600,"latitude":-27.4705,"longitude":153.026,"height":24.5,"deviceId":"5738R00123","deviceName":"5738R00123","northing":6948321.12,"easting":502341.45,"elevation":24.5,"source":"gnss-receiver","appVersion":"0.2.0.0"}
{"timestamp":"2026-09-27T22:05:00.000Z","localDate":"2026-09-28","utcOffsetMinutes":600,"latitude":-27.471,"longitude":153.0275,"height":24.8,"deviceId":"5738R00123","deviceName":"5738R00123","source":"gnss-receiver","appVersion":"0.2.0.0"}
```

---

## 4. Write and upload behaviour

Unchanged intent from 2.1:

1. Append locally on the controller.
2. Re-upload the **whole** daily file on each upload interval (Connect has no append API).
3. Create `Field Tracking` and the device folder on first upload if missing.
4. When offline, keep appending locally; upload changed daily files when online.

Recommended cadence remains 5-minute record / 5-minute upload (configurable in Access).

---

## 5. Device identity

| Concept | Source |
|---------|--------|
| Device folder name | Controller serial, sanitised |
| `deviceId` in JSONL | Same serial (unsanitised) |
| Map layer label | Device folder name by default |

Sanitising: trim whitespace; replace `\ / : * ? " < > |` and control characters with `_`. Empty → `UnknownDevice`.

---

## 6. Consumer behaviour (Survey Tracking Map)

1. On open, ensure `Field Tracking` exists at project root (create if missing and token allows).
2. Treat every **subfolder** of `Field Tracking` as a device (ignore the config file).
3. Populate the side-panel **Visible Devices** layer list from those folders.
4. Load `.jsonl` files directly from each device folder; prefer files whose names contain `_YYYY-MM-DD`.
5. Filter points by `localDate` when present, else UTC date of `timestamp`.
6. Default daily date = browser local calendar date.
7. Devices reporting = devices with ≥1 in-range point after filtering.
8. Basemap (Street / Satellite) is chosen from a map overlay control, not Configuration.

---

## 7. Access checklist for 2.2

1. Stop creating dated subfolders under the device folder.
2. Write `Field Tracking/<serial>/<serial>_<localDate>.jsonl`.
3. Keep writing `localDate` on every line.
4. First upload still creates `Field Tracking/<serial>/` if needed.
5. Confirm the Connect extension layer list shows the serial without manual Configuration.

---

## 8. Change control

| Version | Date | Summary |
|---------|------|---------|
| 1.0 | 2026-09-27 | Initial UTC daily folders |
| 2.0 | 2026-09-28 | Local-date folders, serial device folders, new optional fields |
| 2.1 | 2026-09-28 | Named daily files; reporting based on points |
| 2.2 | 2026-10-08 | Flat device folders (no daily subfolders); auto Field Tracking discovery; Map-only UI |

**Source of truth:** `docs/ACCESS_CONNECT_FEED_CONTRACT.md` in the Survey Tracking Map project; keep an identical copy in the Access app workspace.
