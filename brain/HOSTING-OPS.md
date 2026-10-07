# HOSTING-OPS — mutabe3
Status: approved with plan v2 (D-050). Operating procedures live in `COMMANDS.md`; this file holds the decisions and what is still to do.

## Environments
- **Production:** Hostinger VPS `72.62.132.138` (srv1772644.hstgr.cloud, AlmaLinux 9.8, nginx, shared with other sites); checkout `/var/www/mutabe3/current/projects/mutabe3`; systemd `mutabe3-frontend` (:9100) and `mutabe3-backend` (compiled `node dist/index.js`, :9080) as user `mutabe3`; env `/etc/mutabe3/backend.env`; uploads `/var/www/mutabe3/uploads`; TLS via the host config (method to confirm: AdminBolt or certbot).
- **Staging:** none by decision — local stack (`backend-dev`/`frontend-dev`), `/dashboard/preview/<id>` for drafts, deploy inputs for dry runs, revert on `main` to roll back.
- **Location:** the VPS geolocates to the UK ([ipinfo](https://ipinfo.io/72.62.132.138)); Hostinger has no Middle East region. Cloudflare has an Amman PoP ([cdnplanet](https://www.cdnplanet.com/geo/jordan-cdn/)) — **deferred**; moving nameservers off webhubteam is Rami's call and nginx would need the real client IP passed through.

## Observability (weeks 3–4 — live, D-059)
- **Alerts are GitHub Issues** opened and closed by `.github/workflows/monitor.yml`; GitHub's own notification mail carries them to Rami (the body mentions him). The Postfix/SMTP route planned here was dropped: the VPS cannot deliver to Gmail until SPF/DKIM exist (D-043/D-044, still Rami's DNS gate), Hostinger blocks port 25 by default, and an uptime probe has to run off the box anyway. Issues also give a dated incident log; the repo is public, so alert text stays coarse (percentages, unit states, dump names — never host names or secrets).
- **What runs:** uptime every 10 min from a runner (homepage 200 + site name, `/api/health` 200 `healthy`; re-check after 60 s; silent while a deploy runs); daily 07:17 Amman server facts over the deploy SSH key (`ops/vps/healthcheck.sh` → `ops/monitor/server.mjs`): disk ≥ 90 % (hysteresis 85 %), nightly dump age > 30 h / invalid / tiny / timer or last run failed / uploads archive > 10 d, units + local health, TLS < 14 d, SSH reachability. One issue per category, daily reminder, auto-close. **Sunday digest** on the rolling «🩺» issue is the heartbeat (GitHub disables schedules after 60 days without commits). `-f drill=true` exercises the path end to end; `DRY_RUN=1` runs read-only.
- **Uptime gap (found 2026-10-07):** GitHub delays or drops frequent schedules (the monitor's 10-minute schedule had not fired 1 h 40 min after landing; such schedules fire only every few hours on this account), so the 10-minute probe is not real uptime monitoring. Needed: an external checker on `/` and `/api/health` with mail alerts — Better Stack free tier (10 monitors, 3-min checks, commercial use allowed) is the candidate; Rami creates the account. The GitHub probe stays as a second, slower signal.
- **Later / not needed:** systemd `OnFailure=` and the nginx 5xx counter were dropped (the probes catch the outcomes); Sentry optional (scrub IPs). Once SPF/DKIM exist, the backend mailer can carry a second copy of each alert.

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
