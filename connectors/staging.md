# mutabe3 · connectors/staging

**There is no staging environment.** The 2026-09-12 template described a Vercel staging (`mutabe3.vercel.app`) that was never wired to the real backend; production is the VPS (see `connectors/production.md`).

## What stands in for staging

| Need | How it is met | Since |
|---|---|---|
| Try a change before prod | **Local stack:** `.claude/launch.json` → `backend-dev` (:9080, `packages/backend/.env.local`) + `frontend-dev` (:3100); local Postgres `mutabe3_dev`; test admin `admin@mutabe3.test` | 2026-10-06 |
| Preview the UI against real content | `packages/frontend/.env.local` `VPS_API=https://mutabe3.news` makes the local Next app read prod's public API (read-only use) | 2026-10-06 |
| Preview an unpublished article | `/dashboard/preview/<id>` on prod renders drafts for signed-in editors (orange "معاينة · مسودة" bar) | D-043 Stage 2 |
| Dry-run a server job | deploy inputs, e.g. `gh workflow run deploy-vps.yml -f images_backfill=dry` | D-045 |
| Rehearse the deploy itself | every push to `main` is the deploy; keep changes small, verify locally first, revert on `main` to roll back | D-039 |

## If a real staging is ever wanted
Cheapest fit for this stack: a second pair of systemd units on the VPS (e.g. `:9101`/`:9081`, a `mutabe3_staging` database, `staging.mutabe3.news` server block) plus a second workflow triggered from a `staging` branch. Not planned in brain/ROADMAP.md as of 2026-10-06.

---

**Last updated:** 2026-10-06 (rewritten; the Vercel staging template is retired)
