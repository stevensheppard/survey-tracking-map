# Survey Tracking Map

Trimble Connect project extension that visualizes field-user locations from daily `.jsonl` tracking files on a 2D map (Street / Satellite).

## Features

- Embedded Trimble Connect project extension (Workspace API)
- Auto-creates / uses project-root **Field Tracking** folder
- Auto-discovers device subfolders and builds a collapsible **Visible Devices** layer list
- Flat daily files: `Field Tracking/<serial>/<serial>_YYYY-MM-DD.jsonl`
- Date filters: all time, daily, or custom range
- Devices reporting = devices with ≥1 in-range track point
- MapLibre map with per-device tracks, latest markers, popups, and floating basemap control
- Extension-managed config file in Field Tracking (no Configuration UI)
- Local mock mode for development without Connect

## Prerequisites

- Node.js 20+
- npm 10+
- An HTTPS host for the extension (GitHub Pages recommended — see [docs/GITHUB_HOSTING.md](docs/GITHUB_HOSTING.md))
- Trimble Connect project with permission to read Field Tracking and write the config file

## Install

```bash
npm install
```

## Local development

```bash
npm run dev
```

Connect rejects `http://localhost` manifest URLs. Prefer GitHub Pages for project testing, or use HTTPS (mkcert / ngrok) for local tunnels. See earlier local-testing notes and [docs/GITHUB_HOSTING.md](docs/GITHUB_HOSTING.md).

Mock mode (outside Connect iframe): open the Vite URL directly.

## Build

```bash
npm run build
```

Deploy `dist/` to HTTPS, or push to GitHub and use the included Pages workflow.

## Register in Trimble Connect

1. Host the built app and `manifest.json` at HTTPS URLs (see Pages guide).
2. Update `public/manifest.json` `url` / `icon` to match.
3. In Connect: **Project Settings → Extensions** → add the manifest URL → enable.
4. Open **Survey Tracking Map → Map** from the left nav and approve the access token when prompted.

There is no Configuration submenu. Devices appear automatically from `Field Tracking` subfolders.

## Runtime configuration

Edit [public/runtime-config.json](public/runtime-config.json) before deployment:

- `refreshIntervalSeconds`
- `basemaps.streets` / `basemaps.satellite` (tiles + attribution)

Keep satellite API keys out of the shared Connect project config.

## Auto-managed project config

On first open the extension ensures `Field Tracking` exists and writes:

`Field Tracking/survey-tracking-map.config.json`

You normally do not edit this by hand. Device folders under Field Tracking are the source of truth for the layer list.

## Access → Connect feed contract

**Contract version 2.2** — keep both workspaces in sync:

- [docs/ACCESS_CONNECT_FEED_CONTRACT.md](docs/ACCESS_CONNECT_FEED_CONTRACT.md)

### Expected folder layout (2.2)

```text
Field Tracking/
  survey-tracking-map.config.json
  5738R00123/
    5738R00123_2026-09-28.jsonl
    5738R00123_2026-09-29.jsonl
  5821R00456/
    5821R00456_2026-09-28.jsonl
```

No dated subfolders under a device folder for new uploads. Legacy `YYYY-MM-DD/` folders are still read if present.

## JSONL record contract

Each line is one JSON object. WGS84 `latitude` / `longitude` are required. Prefer `localDate` on every line.

```json
{
  "timestamp": "2026-09-27T22:05:00.000Z",
  "localDate": "2026-09-28",
  "utcOffsetMinutes": 600,
  "latitude": -27.471,
  "longitude": 153.0275,
  "height": 24.8,
  "deviceId": "5738R00123",
  "deviceName": "5738R00123",
  "source": "gnss-receiver",
  "appVersion": "0.2.0.0"
}
```

## Testing

```bash
npm test
npm run lint
npm run build
```

## Docs

- [Deploy in Trimble Connect](docs/DEPLOYMENT.md) ← start here for hosted testing
- [Access ↔ Connect feed contract](docs/ACCESS_CONNECT_FEED_CONTRACT.md)
- [GitHub hosting](docs/GITHUB_HOSTING.md)

**Live URLs**

- App: https://stevensheppard.github.io/survey-tracking-map/
- Manifest: https://stevensheppard.github.io/survey-tracking-map/manifest.json
- Repo: https://github.com/stevensheppard/survey-tracking-map

## Trimble references

- [Trimble Connect developer docs](https://developer.trimble.com/docs/connect)
- [Workspace API](https://developer.trimble.com/docs/connect/tools/api/workspace/)
- [Extend Trimble Connect guide](https://developer.trimble.com/docs/connect/guides/extend/)
