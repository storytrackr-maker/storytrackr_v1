# Deployment Troubleshooting (StoryTrackr)

If production still shows an old UI after a push, use this checklist.

## 1) Confirm which branch you deployed

- `app.storytrackr.app` and `storytrackr.app` custom domains track the **`main` branch** of their Cloudflare Pages projects.
- Pushing to feature branches now creates branch deployments (`--branch=<branch-name>`), but those do **not** replace the production custom domains.

### Practical rule

- For production update: merge/push to `main`.
- For branch testing: open that branch's Pages preview deployment URL from Cloudflare Pages.

## 2) Force a redeploy without code changes

Both workflows now support **manual dispatch** in GitHub Actions:

- `Deploy Pages`
- `Test and Deploy Worker`

Use this when a previous deploy was skipped/failed or you need to republish quickly.

## 3) Avoid stale asset caching

Static JS/CSS headers are intentionally short-lived (`max-age=300, must-revalidate`) for both app and marketing sites.

If users still report old UI immediately after deploy:

1. Cloudflare Dashboard → Caching → **Purge cache** (or purge affected URLs).
2. Hard refresh browser (`Cmd/Ctrl+Shift+R`).
3. Retest in an incognito window.

## 4) Cloudflared tunnel sanity checks

If you are using cloudflared in front of another origin (instead of direct Pages domains), verify:

- tunnel ingress points to the correct host/project;
- the origin path is correct (`app/` vs `marketing/` mixups are common);
- hostname routes are not shadowing each other (e.g., `storytrackr.app/*` vs `app.storytrackr.app/*`).

## 5) API route sanity check

The worker route should remain configured in Cloudflare Dashboard:

- `app.storytrackr.app/api/*` → `storytrackr-worker`

If this route is missing or misrouted, app shells can load while API requests fail.
