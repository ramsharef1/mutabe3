# MUTABE3 — front door · موقع المتابع الاخباري

**Loader (Code):** `Read ~/Projects/forge/projects/mutabe3/mutabe3.md and brain/BIBLE.md, then act on the task.`
**Classic:** this file is the instructions of the claude.ai Project `forge · mutabe3`; its knowledge is `classic/mutabe3.md` (synced from `ramsharef1/forge`).
**First reply of every session starts with the URL echo; every reply ends with the footer (LAW 12).**

🌐 https://mutabe3.news · admin https://mutabe3.news/dashboard · repo github.com/ramsharef1/mutabe3 (public)

---

## What this project is

Arabic-first (RTL) Jordanian online news site. **Client newsroom:** the client's organisation owns it and its 1–3 editors publish; **Rami Alsharef builds and operates the platform** (independent developer-operator). Goal by March 2027: audience, direct ad revenue, credibility, and a product re-deployable for another newsroom. Soft launch with real news while the Media Commission licence is pending (counsel review open). Official name «موقع المتابع الاخباري», logo word «المتابع».

## Where the truth lives (read in this order)

| What | File |
|---|---|
| **Single source of truth** — identity, revenue, design direction, content architecture, findings F-01…F-13, roadmap, gates | `brain/BIBLE.md` |
| Decision log, newest first (D-027 … today), with what was verified and deployed | `brain/DECISIONS.md` |
| Security findings S-01…S-19 and their status | `brain/SECURITY.md` |
| Hosting, backups, monitoring decisions | `brain/HOSTING-OPS.md` |
| Every operating procedure (deploy, ops actions, backups, monitor, security controls, local stack) | `COMMANDS.md` |
| Production connection facts | `connectors/production.md` |
| Fact card (dated) · current plan, priorities, open questions | `FACTS.md` · `PLAN.md` |

`DECISIONS.md` in the repo root holds only the September plan (D-1…D-11), superseded by D-050.

## How a session runs

**Code (Claude Code, `~/Projects/forge/projects/mutabe3`):** read the BIBLE first → work in the monorepo (`packages/frontend` Next 16, `packages/backend` Express + Prisma 7) → verify on the local stack (`.claude/launch.json`: `backend-dev`, `frontend-dev`; local Postgres `mutabe3_dev`) → push to `main` (CI deploys `packages/**`) → verify on production → record a `brain/DECISIONS.md` entry and one INBOX line (`python3 ~/Projects/forge/scripts/inbox.py add "…"`). Server work goes through `ops-vps.yml` actions (`ops/vps/*.sh`) or the hPanel console — Rami's Mac is SSH-banned. Parallel sessions push to `main` too: `git pull --rebase --autostash` before every push.

**Classic (claude.ai):** plans, drafts, decides, reviews, answers — no disk, shell or server. It never claims to have run, deployed or edited anything. It prepares decision text and task blocks for a Code session and ends every finished task with exactly one INBOX line (`from: classic`), which Rami pastes into the FORGE Reports session.

## Rules that bite here

- **mutabe3 only.** Never inspect, cite or comment on other projects. The VPS is shared with other sites (LAW 5): read-only by default; server-wide changes only when Rami asks, with a pre-flight and a rollback.
- **The repo is public:** no secret values anywhere (LAW 2 — paths and env names only); no reproduction details for an open security finding until it is fixed.
- **Rami gates (LAW 3):** money, public-facing content changes, destructive data actions, DNS, credentials, deploy-target changes, reboots, legal sign-off. Ask once in `PLAN.md` → Open questions.
- **Arabic quality (LAW 11):** every string in Arabic, RTL checked; never join two Latin words with an arrow inside Arabic text — write «من … إلى …».
- **Verify before claiming done (LAW 1):** local first, then production; say plainly what could not be verified.

---

**Footer:** 🌐 https://mutabe3.news · admin `/dashboard` · credentials (paths only): VPS `/etc/mutabe3/backend.env` · local `packages/backend/.env.local` · GitHub environment `production` secrets `VPS_HOST` `VPS_USER` `VPS_SSH_KEY` `VPS_PORT`

**Last updated:** 2026-10-07 (rewritten for the Classic project; the 2026-09-12 version is in `archive/2026-10-07-forge-refresh/`)
