# ASM 2026 Roster
## Worship Grow Go · Anthem Students

A Cloudflare Workers app for managing the ASM mentorship roster.

---

## Project Structure

```
asm-roster/
├── src/
│   ├── worker.js          ← Main entry point / router
│   ├── api/
│   │   ├── auth.js        ← Login, signup, sessions, profile
│   │   ├── sheet.js       ← Google Sheets proxy
│   │   ├── admin.js       ← User management
│   │   ├── interactions.js ← Hangout logging
│   │   ├── activity.js    ← Activity feed & stats
│   │   ├── brainDump.js   ← AI text parsing
│   │   ├── upload.js      ← Photo upload to Drive
│   │   └── utils.js       ← Shared helpers (crypto, email, etc.)
│   └── html/
│       ├── index.js       ← Assembles final HTML
│       ├── styles.js      ← All CSS
│       ├── body.js        ← HTML structure
│       ├── app.js         ← Client-side JavaScript
│       └── manifest.js    ← PWA manifest
├── wrangler.toml          ← Cloudflare config
├── .dev.vars.example      ← Secret template
└── .github/workflows/
    └── deploy.yml         ← Auto-deploy on push to main
```

---

## Quick Start (Local Dev)

### 1. Install Wrangler
```bash
npm install -g wrangler
wrangler login
```

### 2. Clone & configure
```bash
git clone https://github.com/YOUR_ORG/asm-roster.git
cd asm-roster
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your real values
```

### 3. Update wrangler.toml
```bash
# Get your KV namespace ID:
wrangler kv namespace list
# Paste the ID into wrangler.toml
```

### 4. Run locally
```bash
wrangler dev
# Open http://localhost:8787
```

---

## Deploy to Production

### Manual deploy
```bash
wrangler deploy
```

### Auto-deploy via GitHub Actions
1. Go to GitHub → Settings → Secrets → Actions
2. Add `CF_API_TOKEN` (from Cloudflare Dashboard → My Profile → API Tokens)
3. Add `CF_ACCOUNT_ID` (from Cloudflare Dashboard → right sidebar)
4. Push to `main` → auto-deploys ✓

### Set production secrets
```bash
wrangler secret put SITE_PASSWORD
wrangler secret put ADMIN_EMAIL
wrangler secret put GOOGLE_SCRIPT_URL
wrangler secret put MAILCHANNELS_FROM
wrangler secret put DRIVE_FOLDER_ID
```

---

## Google Apps Script

1. Open your Google Sheet
2. Extensions → Apps Script
3. Replace `Code.gs` with the `Code.gs` file from this repo
4. Run `setupColumns()` once to create/update sheet headers
5. **First-time deploy:** Deploy → New Deployment → Web App
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Copy the URL → paste as `GOOGLE_SCRIPT_URL` secret
6. **After any code change:** Deploy → **Manage Deployments** → click the
   pencil icon on your existing deployment → set Version to **"New version"**
   → Deploy. **Do NOT create a new deployment** (that changes the URL).

> **Stale-deployment bug:** Google Apps Script web apps are pinned to a
> specific saved version. If you edit the script but only hit Save (not
> redeploy), the live web app keeps running the old code. This is why photos
> may appear to come from the wrong column — the deployed version had
> `COL.photoUrl` pointing at column K (11) instead of column B (2). Always
> redeploy after editing `Code.gs`.

---

## Sheet Column Reference

| Col | Name | Description |
|-----|------|-------------|
| A | Student | Full name |
| B | Link to Photo | Google Drive URL |
| C | Connected This Quarter | "Family Connected" or "Not Connected" |
| D | DATE | Last interaction date |
| E | Notes | Leader notes |
| F | Grade | Grade number |
| G | School | School name |
| H | Birthday | MM/DD/YYYY |
| I | Group, Sport | Interest/sport |
| J | Primary Goal | One main goal |
| K | Goals (JSON) | Array of goals with done status |
| L | Last Interaction Summary | Most recent hangout summary |
| M | Last Leader | Who logged the last interaction |
| N | Interaction Count | Total hangouts logged |

---

## User Roles

| Role | Can Do |
|------|--------|
| `pending` | Can log in, view only |
| `approved` | Can edit roster |
| `leader` | Can edit + leader features |
| `admin` | Everything + user management |

---

## Adding Features

Each feature lives in its own file. To add a new API endpoint:
1. Create `src/api/myFeature.js`
2. Export a `handleMyFeature(request, env, pathname, method)` function
3. Import and route it in `src/worker.js`

To change the UI:
- **Styles** → `src/html/styles.js`
- **HTML structure** → `src/html/body.js`
- **JavaScript logic** → `src/html/app.js`
