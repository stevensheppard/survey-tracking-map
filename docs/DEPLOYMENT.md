# Deploy Survey Tracking Map in Trimble Connect

**GitHub repo:** https://github.com/stevensheppard/survey-tracking-map  
**Hosted app (GitHub Pages):** https://stevensheppard.github.io/survey-tracking-map/  
**Manifest URL (use this in Connect):** https://stevensheppard.github.io/survey-tracking-map/manifest.json

---

## 1. Confirm Pages is live

1. Open the repo → **Actions** → **Deploy to GitHub Pages**
2. Wait until both **build** and **deploy** are green
3. Open https://stevensheppard.github.io/survey-tracking-map/ in a browser  
   You should see the Survey Tracking Map shell (mock mode outside Connect)

If **deploy** is stuck or failed after a green **build**:

1. Repo **Settings → Environments → github-pages**
2. Under **Deployment branches**, ensure **main** is allowed
3. On the failed/stuck run, click **Re-run all jobs**

If Pages is not enabled yet:

1. Repo **Settings → Pages**
2. **Build and deployment → Source:** GitHub Actions
3. Re-run the workflow from **Actions** (`Re-run` or push to `main`)

---

## 2. Register the extension in Trimble Connect

1. Open your Connect **test project** in the browser
2. Go to **Project Settings → Extensions** (or **Settings → Extensions**)
3. Add / register an extension using this **manifest URL**:

```text
https://stevensheppard.github.io/survey-tracking-map/manifest.json
```

4. Enable **Survey Tracking Map**
5. Refresh the Connect tab
6. In the left nav, open **Survey Tracking Map → Map**
7. Approve the **access token** permission when prompted

There is no Configuration page. On open, the extension ensures a project-root **Field Tracking** folder and lists every device subfolder under it.

---

## 3. What Connect needs on the project

Access (or a manual upload) should produce:

```text
Field Tracking/
  <serial>/
    <serial>_YYYY-MM-DD.jsonl
```

Example:

```text
Field Tracking/5738R00123/5738R00123_2026-10-08.jsonl
```

Then on the Map:

- Use **All time** or **Daily** for the file’s local date
- Confirm the device appears under **Visible Devices**
- Tracks / markers should plot after Refresh

---

## 4. Optional: satellite tiles

Edit `public/runtime-config.json` in the repo, set a real satellite tile URL/API key, commit, and push. Pages will redeploy automatically.

Do **not** put satellite keys in the Connect project config file.

---

## 5. Updating after code changes

```bat
cd "C:\Users\ssheppa\Desktop\Connect API User Tracking Extension"
git add .
git commit -m "Describe your change"
git push
```

Wait for Actions → Pages deploy, then hard-refresh Connect (or re-open the extension).

---

## 6. Quick checks if something fails

| Symptom | Likely fix |
|---------|------------|
| Extension missing in nav | Manifest URL wrong, or extension not enabled; refresh Connect |
| Blank / old UI | Pages deploy still running, or browser cache — hard refresh |
| Token / Failed to fetch | Re-approve access token; confirm you are in a project (not All Projects) |
| No devices | Create/upload under `Field Tracking/<serial>/` |
| No points | Date filter vs `localDate` / file name date; click Refresh |

---

## Related docs

- Feed contract (Access ↔ Connect): [ACCESS_CONNECT_FEED_CONTRACT.md](./ACCESS_CONNECT_FEED_CONTRACT.md)
- Repo / Pages mechanics: [GITHUB_HOSTING.md](./GITHUB_HOSTING.md)
