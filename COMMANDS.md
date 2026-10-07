# mutabe3 — COMMANDS

**Operational procedures for mutabe3 as it actually runs.** Every fact below comes from `brain/DECISIONS.md` (D-037 → D-046) and `.github/workflows/deploy-vps.yml`. The 2026-09-12 version of this file described a Docker + Vercel + Strapi plan that was never deployed.

---

## Where things run

| Thing | Value |
|---|---|
| VPS | `72.62.132.138` · `srv1772644.hstgr.cloud` (Hostinger, root) |
| Site | https://mutabe3.news — nginx → Next on `:9100`; `/api/*` → Express on `:9080` |
| Checkout | `/var/www/mutabe3/current/projects/mutabe3` (git, branch `main`, hard-synced by CI) |
| Services | systemd `mutabe3-frontend` (`npm run start`, :9100) · `mutabe3-backend` (`node dist/index.js`, compiled by the deploy — drop-in `20-exec-dist.conf`, D-049; :9080) — both run as system user `mutabe3` via drop-ins `…service.d/10-service-user.conf` (D-048) |
| Backups | app-level: `/var/backups/mutabe3` (root-only), nightly DB dump 00:30 UTC + Sunday uploads archive, 14/6 kept — timer `mutabe3-backup.timer` · VPS-level: hPanel weekly off-site backups (2 kept) + 1-day snapshots (D-048) |
| Server ops | `gh workflow run ops-vps.yml -f action=inspect|status|setup-service-user|setup-backups|backup-now|switch-backend-to-dist|switch-node-22` → runs `ops/vps/<action>.sh` on the VPS (D-048/D-049/D-055) |
| Frontend build env | `/etc/mutabe3/frontend.env` (optional, sourced by the deploy before `next build`): `NEXT_PUBLIC_GTM_ID=GTM-…` turns on GTM + the consent bar (D-055). Empty/missing = no analytics, no banner |
| Backend env | `/etc/mutabe3/backend.env` — the backend unit's `EnvironmentFile` and the **only** real env on the VPS (D-037/D-040) |
| Database | Postgres on the VPS, database `mutabe3`, role `mutabe3_user`; `DATABASE_URL` lives in backend.env (password rotated 2026-10-06, D-042) |
| Uploads | `/var/www/mutabe3/uploads` (`UPLOAD_DIR`), served at `/api/uploads/*`; WebP derivatives at `/api/img/<w>/*` cached in `.cache/` (D-045) |
| nginx | mutabe3 server blocks live inside the shared `/etc/nginx/conf.d/all-domains.conf`; `client_max_body_size 25m` marked `# mutabe3-upload-limit` (D-041) |
| Deploys | GitHub Actions `deploy-vps.yml` over SSH — repo secrets `VPS_HOST` `VPS_USER` `VPS_PORT` `VPS_SSH_KEY` (D-039) |
| Mail | VPS Postfix `localhost:25` by default, or the dashboard's SMTP account (D-044); inbox delivery still needs SPF/DKIM at ns1/ns2.webhubteam.com |

---

## Deploy

- **Automatic:** every push to `main` that touches `packages/**` or the workflow file.
- **Manual re-deploy:** `gh workflow run deploy-vps.yml`
- **With the image backfill (D-045):** `gh workflow run deploy-vps.yml -f images_backfill=dry` (then `apply`, then `apply-delete-original` once the dry run looks right).
- **Watch:** `gh run list --workflow=deploy-vps.yml -L 3` · `gh run watch <id>` · `gh run view <id> --log`
- **What a run does:** fast-forward the checkout to `origin/main` (refuses if prod has commits of its own) → idempotent server config (`UPLOAD_DIR`, uploads dir, nginx body limit) → `npm install` → prints `node -v` and loads `sharp` (fails here, before any restart, if the platform binary is missing) → `prisma db push` + `prisma generate` with backend.env sourced (a destructive schema change fails the deploy instead of losing data) → optional backfill → backend `tsc` build to `packages/backend/dist` (a type error fails the deploy) → `next build` (then `.next` handed to the service user) → restart both units → health checks polled until 200/200.
- **Rollback:** `git revert <bad commit>` on `main` and push; CI redeploys. Never reset the prod checkout by hand.

---

## Getting onto the VPS

- Rami's Mac is **edge-banned by Hostinger for SSH** (see the project memory). Do server work through CI or the hPanel **Web console**: hPanel → VPS → Settings → SSH keys → *Web console*. hPanel's Settings page also has *Unblock my SSH IP*.
- Deploy key: `~/.ssh/mutabe3_deploy` on Rami's Mac; its public key is in `/root/.ssh/authorized_keys` and in hPanel's SSH keys. Secrets were set with `gh secret set`.
- Rule: never hand Rami ```bash blocks for the server — he runs them on his Mac. Type into the console yourself or go through CI.

### In the web console

```bash
systemctl status mutabe3-backend mutabe3-frontend
journalctl -u mutabe3-backend -n 100 -f
journalctl -u mutabe3-frontend -n 100 -f
systemctl restart mutabe3-backend        # or mutabe3-frontend
nginx -t && systemctl reload nginx
curl -s localhost:9080/api/health; curl -sI localhost:9100 | head -1
du -sh /var/www/mutabe3/uploads; ls /var/www/mutabe3/uploads/.cache
```

---

## Database (Prisma CLI on the VPS)

```bash
cd /var/www/mutabe3/current/projects/mutabe3
set -a; . /etc/mutabe3/backend.env; set +a        # the CLI needs the real DATABASE_URL (D-037/D-040)
npx prisma db push --schema=packages/backend/prisma/schema.prisma --skip-generate
npx prisma generate --schema=packages/backend/prisma/schema.prisma
psql "$DATABASE_URL" -c '\dt'
pg_dump "$DATABASE_URL" > /var/backups/mutabe3-$(date +%F).sql
```

- Schema changes ship as additive `prisma db push` inside the deploy; nothing runs migrations by hand.
- Password rotation procedure: D-040/D-042 (`ALTER ROLE` in the console, update backend.env, `systemctl restart mutabe3-backend`).

---

## Backups (D-048)

- **What runs:** `/usr/local/bin/mutabe3-backup` via `mutabe3-backup.timer` every night at 00:30 UTC (03:30 Amman): `pg_dump --format=custom` of the live DB (validated with `pg_restore --list`), plus a tar of `UPLOAD_DIR` (without `.cache`) on Sundays. Keeps 14 daily dumps and 6 weekly archives in `/var/backups/mutabe3` (0700 root). On this VPS only — no off-site copy yet.
- **Check:** `gh workflow run ops-vps.yml -f action=status` (lists the newest files, timer, last log line) · **take one now:** `-f action=backup-now`.
- **Restore the database** (web console, as root):
  ```bash
  set -a; . /etc/mutabe3/backend.env; set +a
  pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" /var/backups/mutabe3/db-<timestamp>.dump
  systemctl restart mutabe3-backend
  ```
- **Restore uploads:** `tar -xzf /var/backups/mutabe3/uploads-<timestamp>.tgz -C /var/www/mutabe3/uploads && chown -R mutabe3: /var/www/mutabe3/uploads`
- **Drill:** `setup-backups` is idempotent and ends with a restore into a scratch database (`mutabe3_restore_drill`, dropped afterwards); re-run it any time to prove the newest dump restores.
- A separate, generic `/etc/cron.d/vps-backup` (03:30, `/root/backup/vps-backup.sh`) exists at VPS level and is not managed by this repo.

### VPS-level (off-site) — hPanel Snapshots & Backups
- **Where:** hPanel → VPS → `srv1772644.hstgr.cloud` → Backups & Monitoring → **Snapshots & Backups** (`https://hpanel.hostinger.com/vps/1772644/backups`). hPanel sessions expire; Rami signs in inside the Browser pane, then Claude can drive the page.
- **Weekly automatic backups** of the whole VPS, stored off-server (France), two copies kept, ≈1 h to restore. Each copy contains `/var/backups/mutabe3`, so it carries up to 14 nightly dumps too. Daily backups are a $3.00/mo add-on (two daily + two weekly kept) — Rami's decision.
- **Snapshot** = manual whole-VPS image: one at a time, replaced by the next, **expires after 1 day**, deleted by an OS reinstall or a restore. Take one *before* risky server changes (`Create snapshot` on that page); do not count on it as retention.
- **Restore from a VPS backup/snapshot replaces the entire server** — every site on this box (okath, telescope, jugate, boltweb, …), 10 min to a few hours, cannot be stopped. Use only for server loss. For a mutabe3-only problem use the database/uploads restore above.

---

## Monitoring & alerts (D-059)

- **Channel:** GitHub Issues in this repo, opened and closed by `.github/workflows/monitor.yml`. Opening one emails Rami through GitHub's own notifications (the body mentions `@ramsharef1`); closing it emails the recovery. No mail server is involved — the VPS cannot reach Gmail inboxes until SPF/DKIM exist (D-043/D-044).
- **Uptime** (every 10 min, from a GitHub runner — `ops/monitor/uptime.mjs`): `https://mutabe3.news/` must answer 200 with «المتابع» in the HTML and `/api/health` 200 `healthy` (includes a DB round-trip). A failure is re-checked after 60 s, ignored while `deploy-vps.yml` is running, then opens «🔴 الموقع لا يستجيب». Hourly reminder comment while down; auto-closed with the outage duration on recovery.
- **Server** (daily 04:17 UTC = 07:17 Amman, over the deploy SSH credentials): `ops/vps/healthcheck.sh` prints `key=value` facts, `ops/monitor/server.mjs` alerts on disk ≥ 90 % (clears below 85 %), newest dump older than 30 h / not restorable / under 10 KB / timer inactive / last run failed / uploads archive older than 10 days, any of backend · frontend · nginx · postgres not `active` or local health ≠ 200, TLS certificate under 14 days (measured from the runner), SSH unreachable. One issue per category (`alert:*` labels), daily reminder while open, auto-closed when clear.
- **Weekly digest:** on Sundays the daily run comments a health table on the rolling issue «🩺 الصحة الأسبوعية — mutabe3.news». That mail is the heartbeat: GitHub disables scheduled workflows after 60 days without a commit, so if the Sunday mail stops, open Actions → Monitor.
- **Failed units on the shared box:** `gh workflow run ops-vps.yml -f action=failed-units` (read-only: state, journal and `/var/log/messages` lines per unit — the journal here is volatile and drops lines within hours, rsyslog keeps them). The 2026-10-07 clean-up and its rollback lines are D-060 (`cleanup-failed-units`, idempotent).
- **Run by hand:** `gh workflow run monitor.yml -f check=uptime|server|weekly` · facts only: `gh workflow run ops-vps.yml -f action=healthcheck` · **drill:** `gh workflow run monitor.yml -f check=uptime -f drill=true` opens a «🧪 تجربة إنذار» issue (red run); `-f check=uptime` again closes it with a recovery comment.
- **Local dry run (reads the repo, writes nothing):** `DRY_RUN=1 GH_TOKEN=$(gh auth token) node ops/monitor/uptime.mjs` · `DRY_RUN=1 GH_TOKEN=$(gh auth token) TLS_DAYS=60 node ops/monitor/server.mjs facts.txt` with any `key=value` facts file (`MONITOR_DRILL=1`, `SSH_OK=0`, `WEEKLY=1` force the other paths).
- **Noise:** a run goes red only when it opens an issue — one red run per incident. Closing an alert issue by hand is fine; the next run reopens it if the condition persists.
- **Not watched:** Hostinger's weekly VPS backups (hPanel only), nginx 5xx rates, page speed. Failed deploys already mail the pusher through GitHub's default Actions notifications.

---

## Service user (D-048)

- Both units run as system user `mutabe3` (uid 789, `/sbin/nologin`, HOME `/var/lib/mutabe3`), set by `/etc/systemd/system/mutabe3-{backend,frontend}.service.d/10-service-user.conf` (`User/Group`, `UMask=0022`, `NoNewPrivileges`, `PrivateTmp`, cache/HOME env). `/etc/mutabe3/backend.env` stays root-only; systemd injects it.
- Writable by the service: `/var/www/mutabe3/uploads` (+ `.cache`) and `packages/frontend/.next` (the deploy chowns `.next` after each build). Everything else in the checkout is root-owned and world-readable.
- If a future change needs root again, remove the drop-ins and `systemctl daemon-reload && systemctl restart …` — or re-run `setup-service-user`, which rolls itself back if health checks fail.

---

## Local verification (before any deploy)

- `.claude/launch.json` has `backend-dev` (:9080, sources `packages/backend/.env.local`) and `frontend-dev` (:3100). Start them with the Browser pane's preview tools, not with Bash.
- Local Postgres 15 (brew), database `mutabe3_dev`; test admin `admin@mutabe3.test` — its password is a comment in the gitignored `packages/backend/.env.local`, never paste it in chat.
- `packages/frontend/.env.local`: `VPS_API=http://127.0.0.1:9080` to test against the local API, `https://mutabe3.news` to preview against prod data; restore to prod afterwards.
- Checks: `npm run lint` (frontend `next lint`, backend `eslint src`), `npx tsc --noEmit` in `packages/frontend`, `npm run typecheck -w packages/backend` (strict), `npm test` (no suites yet; exits 0).
- Run the compiled backend the way prod does: `npm run build -w packages/backend` then (env sourced) `PORT=9081 node packages/backend/dist/index.js`.

---

## Media

- Upload: `POST /api/admin/upload` (multipart field `file`, ≤15 MB, jpeg/png/webp/gif) → stored as one WebP master; gif and animated webp untouched (D-045).
- List: `GET /api/admin/media` · Delete: `DELETE /api/admin/media/YYYY/MM/name.ext` — 409 while an article still references it, admins may add `?force=1` (D-046).
- Derivatives: `/api/img/{160|320|480|640|960|1280}/YYYY/MM/name.ext`, cached under `uploads/.cache/`, regenerated when the master changes.
- Legacy jpg/png masters: the deploy input `images_backfill` (dry → apply → apply-delete-original).

---

## Prod admin testing

Rami keeps the dashboard signed in inside the Browser pane. Drive `/api/admin/*` from `javascript_tool` with `localStorage.accessToken`, then remove test articles and test media through the API (D-041, D-045, D-046).

---

## Emergency

- **Site down:** `systemctl status` both units, `journalctl -u … -n 200`, `nginx -t`; re-run the last green deploy with `gh workflow run deploy-vps.yml`.
- **Bad release:** revert on `main`; CI redeploys.
- **Disk full on the VPS:** `du -sh /var/www/mutabe3/uploads /var/www/mutabe3/uploads/.cache`; the `.cache` derivatives are regenerable and safe to delete.

---

**Last updated:** 2026-10-07 (monitoring & alerts, D-059)  
**Authority:** FORGE (Rami approves changes to this file)  
**Related:** brain/DECISIONS.md · brain/ROADMAP.md · connectors/production.md · connectors/staging.md
