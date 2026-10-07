# mutabe3 · FACTS

**Canonical fact card** (LAW 9, 14): every row dated (✅ = verified that day) or ⬜. Production connection detail lives in `connectors/production.md`; when the two disagree, the connector wins and this file is fixed. No secret values — paths and env names only (LAW 2).

## Site & domain

| Fact | Value | Date |
|---|---|---|
| Site | https://mutabe3.news (www → same) · alias `mutabe3.hstgr.cloud` | 2026-10-07 ✅ |
| Admin | https://mutabe3.news/dashboard — roles ADMIN · EDITOR · JOURNALIST (VIEWER = no dashboard) | 2026-10-07 ✅ |
| Name servers | ns1/ns2.webhubteam.com · A → 72.62.132.138 (apex and www) | 2026-10-07 ✅ |
| Mail DNS | **no MX, no SPF/DKIM TXT** — newsletter mail cannot reach inboxes until Rami adds them | 2026-10-07 ✅ |
| TLS | Let's Encrypt via certbot on the VPS, valid to 2026-12-15, auto-renew working | 2026-10-07 ✅ |

## Stack

| Component | Value | Date |
|---|---|---|
| Frontend | Next.js 14.2 App Router, `output: standalone`, PWA, RTL, Noto Kufi/Naskh — `packages/frontend` | 2026-10-07 ✅ |
| Backend | Express 4 + Prisma 5, compiled to `dist/` — `packages/backend` | 2026-10-07 ✅ |
| Database | PostgreSQL 13 on the VPS, db `mutabe3`; reachable from the server only (D-063) | 2026-10-07 ✅ |
| Runtime | Node 22 under `/opt/node22` for build and both units (D-056); the VPS's global Node 20 is left for other sites | 2026-10-07 ✅ |
| Not used | Strapi, Vercel, Meilisearch, Redis (dependency removed D-065), Sentry, Docker (all from the September plan, dropped) | 2026-10-07 ✅ |

## Host & services

| Fact | Value | Date |
|---|---|---|
| VPS | Hostinger `srv1772644.hstgr.cloud` · 72.62.132.138 · AlmaLinux 9.8 · 1 vCPU · 3.6 GB RAM · 49 GB disk (66 %) · **shared with other sites** | 2026-10-07 ✅ |
| Kernel | 5.14.0-687.54.1 (rebooted D-062) | 2026-10-07 ✅ |
| Units | `mutabe3-frontend` (`next start`, :9100) · `mutabe3-backend` (`node dist/index.js`, :9080) · user `mutabe3` · nginx enabled at boot (D-062) | 2026-10-07 ✅ |
| nginx | server blocks in the shared `/etc/nginx/conf.d/all-domains.conf`; `/api/` → :9080, `/` → :9100; appends `X-Forwarded-For` (D-064) | 2026-10-07 ✅ |
| Checkout | `/var/www/mutabe3/current/projects/mutabe3` | 2026-10-07 ✅ |
| Env files | `/etc/mutabe3/backend.env` (root, 0600) · optional `/etc/mutabe3/frontend.env` (build-time `NEXT_PUBLIC_*`) | 2026-10-07 ✅ |
| CORS | API allows `https://mutabe3.news` + `https://www.mutabe3.news` (code default; optional `CORS_ORIGINS` unset); backend runs with `NODE_ENV=production` — localhost origin refused (D-065) | 2026-10-07 ✅ |
| Uploads | `/var/www/mutabe3/uploads` → `/api/uploads/*`, WebP derivatives `/api/img/<w>/*` | 2026-10-07 ✅ |
| Security updates | `dnf-automatic` installs security packages daily, never reboots; Apache excluded (conflicts with AdminBolt's suexec) | 2026-10-07 ✅ |

## Delivery, backups, monitoring

| Fact | Value | Date |
|---|---|---|
| Deploy | push to `main` touching `packages/**` → `.github/workflows/deploy-vps.yml` (npm ci, additive `prisma db push`, builds, restart, health polls) | 2026-10-07 ✅ |
| Server ops | `gh workflow run ops-vps.yml -f action=<name>` (scripts in `ops/vps/`) | 2026-10-07 ✅ |
| Backups | nightly `pg_dump` 00:30 UTC (14 kept) + Sunday uploads archive (6 kept) in `/var/backups/mutabe3`; hPanel weekly whole-VPS backups (2 copies, off-site) | 2026-10-07 ✅ |
| Monitoring | `monitor.yml` → GitHub Issues that mail Rami: daily server facts 04:17 UTC, Sunday digest (issue #7); the 10-minute uptime schedule fires only every few hours — **external uptime checker pending** | 2026-10-07 ✅ |

## Repository

| Fact | Value | Date |
|---|---|---|
| GitHub | `ramsharef1/mutabe3` — **public**, standalone (gitignored inside the forge repo) | 2026-10-07 ✅ |
| Local | `~/Projects/forge/projects/mutabe3` · branch `main` · npm workspaces + committed lockfile | 2026-10-07 ✅ |

## Content & money state

| Fact | Value | Date |
|---|---|---|
| Articles | 19 published, all demo (stay until real content exists — removal is a separate Rami gate) | 2026-10-07 ✅ |
| Ads | all four zones on demo; house banners with dates, first-party counts, CSV report ready (D-057) | 2026-10-07 ✅ |
| Analytics | GTM + consent bar built, dormant until `NEXT_PUBLIC_GTM_ID` is set | 2026-10-07 ✅ |

## Credentials (paths and names only)

| What | Where |
|---|---|
| Database URL, JWT secrets, upload dir | VPS `/etc/mutabe3/backend.env` |
| CI SSH access | GitHub environment `production`: `VPS_HOST` `VPS_USER` `VPS_SSH_KEY` `VPS_PORT` |
| Local test admin | comment in `packages/backend/.env.local` (gitignored) |
| SMTP password | sealed in the database, set from `/dashboard/newsletter` (never returned) |

## Not known yet (⬜ — Rami)

| Fact | Value |
|---|---|
| Client legal name · editor-in-chief (imprint) | ⬜ |
| Counsel (identity, review of the seven legal pages) | ⬜ |
| GTM container id (Google account) | ⬜ |
| Mailboxes editor@ ads@ corrections@ privacy@ | ⬜ |
| Original logo artwork file | ⬜ |
| External uptime checker account | ⬜ |

**Last updated:** 2026-10-07 (rewritten from verified facts; the 2026-09-12 card is in `archive/2026-10-07-forge-refresh/`)
