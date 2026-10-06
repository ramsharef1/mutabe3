# mutabe3 — COMMANDS

**Operational procedures for mutabe3 as it actually runs.** Every fact below comes from `brain/DECISIONS.md` (D-037 → D-046) and `.github/workflows/deploy-vps.yml`. The 2026-09-12 version of this file described a Docker + Vercel + Strapi plan that was never deployed.

---

## Where things run

| Thing | Value |
|---|---|
| VPS | `72.62.132.138` · `srv1772644.hstgr.cloud` (Hostinger, root) |
| Site | https://mutabe3.news — nginx → Next on `:9100`; `/api/*` → Express on `:9080` |
| Checkout | `/var/www/mutabe3/current/projects/mutabe3` (git, branch `main`, hard-synced by CI) |
| Services | systemd `mutabe3-frontend` (`next start`, :9100) · `mutabe3-backend` (Express API, :9080; currently runs as root — D-041) |
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
- **What a run does:** fast-forward the checkout to `origin/main` (refuses if prod has commits of its own) → idempotent server config (`UPLOAD_DIR`, uploads dir, nginx body limit) → `npm install` → prints `node -v` and loads `sharp` (fails here, before any restart, if the platform binary is missing) → `prisma db push` + `prisma generate` with backend.env sourced (a destructive schema change fails the deploy instead of losing data) → optional backfill → `next build` → restart both units → health checks must return 200/200.
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
- No backup job is recorded in DECISIONS yet — the `pg_dump` line above is manual.
- Password rotation procedure: D-040/D-042 (`ALTER ROLE` in the console, update backend.env, `systemctl restart mutabe3-backend`).

---

## Local verification (before any deploy)

- `.claude/launch.json` has `backend-dev` (:9080, sources `packages/backend/.env.local`) and `frontend-dev` (:3100). Start them with the Browser pane's preview tools, not with Bash.
- Local Postgres 15 (brew), database `mutabe3_dev`; test admin `admin@mutabe3.test` — its password is a comment in the gitignored `packages/backend/.env.local`, never paste it in chat.
- `packages/frontend/.env.local`: `VPS_API=http://127.0.0.1:9080` to test against the local API, `https://mutabe3.news` to preview against prod data; restore to prod afterwards.
- Checks: `npm run lint` (frontend `next lint`, backend `eslint src`), `npx tsc --noEmit` in `packages/frontend`, `npm test` (no suites yet; exits 0).

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

**Last updated:** 2026-10-06 (rewritten to the deployed stack)  
**Authority:** FORGE (Rami approves changes to this file)  
**Related:** brain/DECISIONS.md · brain/ROADMAP.md · connectors/production.md · connectors/staging.md
