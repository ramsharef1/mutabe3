# HOSTING-OPS — mutabe3
Status: approved with plan v2 (D-050). Operating procedures live in `COMMANDS.md`; this file holds the decisions and what is still to do.

## Environments
- **Production:** Hostinger VPS `72.62.132.138` (srv1772644.hstgr.cloud, AlmaLinux 9.8, nginx, shared with other sites); checkout `/var/www/mutabe3/current/projects/mutabe3`; systemd `mutabe3-frontend` (:9100) and `mutabe3-backend` (compiled `node dist/index.js`, :9080) as user `mutabe3`; env `/etc/mutabe3/backend.env`; uploads `/var/www/mutabe3/uploads`; TLS via the host config (method to confirm: AdminBolt or certbot).
- **Staging:** none by decision — local stack (`backend-dev`/`frontend-dev`), `/dashboard/preview/<id>` for drafts, deploy inputs for dry runs, revert on `main` to roll back.
- **Location:** the VPS geolocates to the UK ([ipinfo](https://ipinfo.io/72.62.132.138)); Hostinger has no Middle East region. Cloudflare has an Amman PoP ([cdnplanet](https://www.cdnplanet.com/geo/jordan-cdn/)) — **deferred**; moving nameservers off webhubteam is Rami's call and nginx would need the real client IP passed through.

## Observability (weeks 3–4)
- **Email alerts** (owner decision 4.2) via the VPS Postfix / dashboard SMTP account to an address Rami names; **depends on SPF/DKIM DNS** for reliable delivery. Content: systemd `OnFailure=` for both units; a 5-minute timer checking disk %, newest dump age > 26 h, 5xx count from journald; deploy failure from CI.
- **Uptime:** an external check on the homepage and `/api/health` (Better Stack free tier: 10 monitors, 3-minute checks — [source](https://betterstack.com/uptime-robot-alternative); UptimeRobot's free plan is non-commercial — [source](https://dev.to/velprove/uptimerobot-commercial-use-free-alternatives-for-business-sites-in-2026-5d75)). Sentry free tier optional later (scrub IPs).

## Performance budget (article + home, mobile p75)
LCP ≤ 2.5 s (target 2.0), INP ≤ 200 ms, CLS ≤ 0.1 (target 0.05) ([web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds)); ≤ 3 font files first view (Kufi 700 + Naskh 400/700, arabic + latin subsets, `swap`; Amiri dropped); hero via `/api/img` with priority; fixed ad boxes. Lighthouse pass in weeks 9–12.

## Backups & recovery (exists — D-048)
Nightly `pg_dump` (custom format, validated) + Sunday uploads archive, 14 daily / 6 weekly on the VPS; restore drill proven; weekly off-site Hostinger VPS backups (2 copies) chosen over the daily add-on; snapshots last 1 day. To add: monthly automated restore drill with an email report; quarterly uploads restore to scratch.

## Deploy (exists — D-039/D-048/D-049)
Push to `main` touching `packages/**` → fast-forward checkout, idempotent server config, `npm install`, node/sharp check, `prisma db push` + generate, optional image backfill, backend `tsc`, `next build` (then `.next` handed to the service user), restart, polled health checks. **To do now:** commit the lockfile + `npm ci`; Node 22 via ops action; Dependabot. **Deferred:** release-directory deploys with symlink swap and auto-revert; non-root deploy user; migrations instead of `db push`.

## Instance-per-client (deferred past 90 days — shape agreed)
Layout `/srv/newsroom/<slug>/{releases/<sha>,current→,uploads}`, `/etc/newsroom/<slug>.env` (0600), template units `newsroom-web@<slug>` / `newsroom-api@<slug>`, own `/etc/nginx/conf.d/newsroom-<slug>.conf`, ports from a repo `instances.json`. Provision script via `ops-vps.yml` (user → DB + role → dirs → env → units → nginx + `nginx -t` → TLS → first deploy → backup timer → drill → uptime monitor). One repo, one deploy workflow, matrix over instances with `environment: <slug>` secrets; canary (mutabe3) first; no forks. Open: client #2 timing and whether on its own VPS; brand files in a public repo.

## Mobile
PWA is the product. Web push for عاجل in weeks 9–12: VAPID per instance, `PushSubscription` table, `sw.js` push/notificationclick, editor «تنبيه عاجل» on publish with a daily cap; iOS needs Home Screen install ([OneSignal](https://documentation.onesignal.com/docs/web-push-for-ios)). Capacitor wrapper only if advertisers demand store presence or iOS opt-in stays low.
