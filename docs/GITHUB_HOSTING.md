# Hosting Survey Tracking Map on GitHub

This project does not currently have Git or the GitHub CLI installed in the shell environment used for development. Follow these steps on your PC to publish the extension for Connect testing.

## 1. Install tools

1. Install [Git for Windows](https://git-scm.com/download/win)
2. Install [GitHub CLI](https://cli.github.com/) (optional but easiest), or use the GitHub website
3. Restart Command Prompt / PowerShell

Sign in:

```bat
gh auth login
```

Choose GitHub.com → HTTPS → login in the browser.

## 2. Initialise the repo (from the extension folder)

```bat
cd "C:\Users\ssheppa\Desktop\Connect API User Tracking Extension"
git init
git add .
git commit -m "Add Survey Tracking Map Connect extension"
```

## 3. Create the GitHub repository

### Option A — GitHub CLI

```bat
gh repo create survey-tracking-map --public --source=. --remote=origin --push
```

Use `--private` instead of `--public` if you prefer.

### Option B — Website

1. Open https://github.com/new
2. Name it e.g. `survey-tracking-map`
3. Do **not** add a README (this folder already has one)
4. Create the repository, then:

```bat
git remote add origin https://github.com/YOUR_USERNAME/survey-tracking-map.git
git branch -M main
git push -u origin main
```

## 4. Enable GitHub Pages (recommended for Connect HTTPS)

Connect needs an **HTTPS** URL for the extension and manifest.

1. In the GitHub repo: **Settings → Pages**
2. Build and deployment source: **GitHub Actions**
3. Add the workflow below as `.github/workflows/deploy-pages.yml`
4. After the first successful run, your site will be at:

```text
https://YOUR_USERNAME.github.io/survey-tracking-map/
```

### Workflow file

Create `.github/workflows/deploy-pages.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Because this app uses `base: "./"` in Vite, relative asset paths work under GitHub Pages project sites.

## 5. Point the Connect manifest at Pages

After Pages is live, update `public/manifest.json` (and commit/push):

```json
{
  "title": "Survey Tracking Map",
  "url": "https://YOUR_USERNAME.github.io/survey-tracking-map/",
  "icon": "https://YOUR_USERNAME.github.io/survey-tracking-map/icon.svg",
  "description": "Display field user locations from daily JSONL tracking files on an OSM or satellite map.",
  "enabled": true,
  "extensionType": ["project"]
}
```

Also ensure `dist` includes `manifest.json` and `runtime-config.json` (they are under `public/`, so Vite copies them automatically).

## 6. Register in Trimble Connect

1. Project **Settings → Extensions**
2. Manifest URL:

```text
https://YOUR_USERNAME.github.io/survey-tracking-map/manifest.json
```

3. Enable **Survey Tracking Map**
4. Refresh Connect and open the extension from the left nav
5. Approve the access-token permission when prompted

## 7. Satellite tiles

Edit `public/runtime-config.json` before deploy and put your satellite provider URL/API key in `basemaps.satellite.tiles`. Do not commit secrets if the repo is public—use a private repo or a deploy-time config approach.

## 8. Local HTTPS testing (still useful)

GitHub Pages is for shared/project testing. For quick local iteration you can keep using `vite-plugin-mkcert` / `npm run dev` and a tunnel if Connect rejects localhost.

## Checklist

- [ ] Git + GitHub account ready
- [ ] Repo created and code pushed
- [ ] Pages workflow green
- [ ] `manifest.json` URLs match the Pages site
- [ ] Extension added in the Connect test project
- [ ] Access app writing flat `Field Tracking/<serial>/<serial>_YYYY-MM-DD.jsonl` files (contract 2.2)
