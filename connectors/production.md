# mutabe3 · connectors/production

**Production = the Hostinger VPS, deployed by GitHub Actions.** (The 2026-09-12 template described a Vercel production that was never used; a Vercel project from that scaffold may still exist but is not production.)

## Deployment details

| Setting | Value | Status |
|---------|-------|--------|
| Host | `72.62.132.138` · `srv1772644.hstgr.cloud` (Hostinger VPS, root) | ✅ live |
| Domain | https://mutabe3.news (+ www) — DNS at ns1/ns2.webhubteam.com | ✅ live |
| Branch | `main` → auto-deploy on push touching `packages/**` | ✅ |
| Checkout | `/var/www/mutabe3/current/projects/mutabe3` | ✅ |
| Frontend | systemd `mutabe3-frontend` · `next start` · `:9100` | ✅ |
| Backend | systemd `mutabe3-backend` · Express from the compiled `dist/` (`node dist/index.js`, D-049) · `:9080` · env `/etc/mutabe3/backend.env` | ✅ |
| Database | Postgres on the VPS · db `mutabe3` · role `mutabe3_user` | ✅ |
| Uploads | `/var/www/mutabe3/uploads` → `/api/uploads/*`, derivatives `/api/img/<w>/*` | ✅ (D-045) |
| nginx | server blocks in `/etc/nginx/conf.d/all-domains.conf`, body limit 25m | ✅ (D-041) |
| TLS | nginx on the VPS (shared host config) | ✅ |
| CI | `.github/workflows/deploy-vps.yml` — secrets `VPS_HOST` `VPS_USER` `VPS_PORT` `VPS_SSH_KEY` | ✅ (D-039) |

## Environment variables

### Backend — `/etc/mutabe3/backend.env` (EnvironmentFile of `mutabe3-backend`)
- `DATABASE_URL` → `postgresql://mutabe3_user:…@localhost:5432/mutabe3`
- `PORT` → 9080 · `NODE_ENV` → production · `FRONTEND_URL` → https://mutabe3.news
- `JWT_SECRET`, `JWT_REFRESH_SECRET` → auth signing keys (also derive the SMTP password seal, D-044 — rotating them re-asks for the SMTP password)
- `UPLOAD_DIR` → `/var/www/mutabe3/uploads` (added idempotently by the deploy)
- Optional mail: `SMTP_HOST/PORT/USER/PASSWORD/FROM/SECURE`, `MAIL_DRY_RUN=1`; precedence `MAIL_DRY_RUN` → dashboard SMTP settings → `SMTP_*` env → Postfix `localhost:25` (D-044)

### Frontend (`mutabe3-frontend` unit)
- `VPS_API` → where server components and the dev proxy reach the API; defaults to `http://127.0.0.1:9080`, which is right on the VPS.

### GitHub (repo `ramsharef1/mutabe3`, environment `production`)
- `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_SSH_KEY` (private half of `~/.ssh/mutabe3_deploy`)

## Verification (every deploy, automatic)

- [x] Checkout fast-forwarded to `origin/main` (refuses if prod has local commits)
- [x] `node -v` + `sharp` load check pass before anything restarts
- [x] `prisma db push` is additive (destructive change fails the deploy)
- [x] `curl localhost:9100` → 200 and `curl localhost:9080/api/articles` → 200
- [ ] Mail inbox delivery — waiting on SPF/DKIM (or provider) DNS records (D-043/D-044)

## Hardening in place (D-048)
- Both services run as the unprivileged system user `mutabe3` (systemd drop-ins; `backend.env` stays root-only, injected by systemd); the deploy hands `.next` to that user after each build.
- Nightly backups at 00:30 UTC (`mutabe3-backup.timer`): custom-format `pg_dump` + Sunday uploads archive, 14 daily / 6 weekly kept in `/var/backups/mutabe3`; first dump and a restore drill verified 2026-10-06.
- Server operations run as reviewable scripts through `ops-vps.yml` (`inspect`, `status`, `setup-service-user`, `setup-backups`, `backup-now`).

- Off-site: Hostinger's **weekly automatic VPS backups** are active (stored in France, two copies kept, ≈1 h restore) and include `/var/backups/mutabe3`; a whole-VPS **snapshot** (1-day lifetime) was taken after the 2026-10-06 hardening. hPanel → VPS → Backups & Monitoring → Snapshots & Backups.

## Known gaps
- VPS-level recovery point is weekly by decision (Rami, 2026-10-06: daily add-on declined); nightly app-level dumps cover the days in between. A VPS restore replaces every site on the box.

---

**Last updated:** 2026-10-06 (rewritten to the deployed stack) · **Sources:** brain/DECISIONS.md D-037, D-039, D-041, D-042, D-044, D-045, D-046
