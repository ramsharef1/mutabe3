# mutabe3 — Jordanian news agency platform

**ID:** mutabe3 · **Tier:** forge · **Type:** Next.js SaaS  
**Status:** 🔨 Architecture phase · **Owner:** Rami Alsharef

---

## Front Door

**mutabe3** is a full-stack, modern news agency website optimized for the Jordanian market. The platform enables journalists to publish articles, readers to discover news by category/topic, and provides comprehensive editorial and analytics tools.

### Identity

| Fact | Value |
|------|-------|
| **Code repo** | `github.com/ramsharef1/forge` (`projects/mutabe3/`) |
| **Loader** | Read `FACTS.md` · see `PLAN.md` for decisions · check `DISPATCH.md` for tasks |
| **Stack** | Next.js 14+, Node.js, PostgreSQL, Strapi CMS, Vercel |
| **Facts** | See `FACTS.md` (canonical source) |
| **Plan** | See `PLAN.md` (decisions, state, priorities, resume point) |
| **Session log** | `WORKLOG.md` (newest first) |
| **Decisions** | `DECISIONS.md` (numbered D-log, only place Rami decisions recorded) |
| **Open tasks** | `DISPATCH.md` (from FORGE to project) |

### How a session runs

1. Open mutabe3 Code session in `/Users/ramialsharef/Projects/forge/projects/mutabe3/`
2. Read this file (front door)
3. Check `DISPATCH.md` for **## Open** tasks
4. Read `FACTS.md` for current state (site URLs, DB, credentials, git branch, local paths)
5. Read `PLAN.md` § resume point (where to pick up, verified state, open questions for Rami)
6. Append to `WORKLOG.md` with turn number and result
7. If decision needed: write to `DECISIONS.md` § open + tag Rami
8. When closing a DISPATCH task: move it to `DISPATCH.md` **## Done** + write INBOX line

### Gates (requires Rami approval)

- Destructive operations: `git reset --hard`, force-push, delete branches
- Env/secret changes on production
- Major scope changes or timeline shifts
- Security or compliance decisions

### URLs & Links

- **Staging:** https://mutabe3.vercel.app (from Vercel)
- **Production:** [TBD — migrating from vercel.app subdomain after launch]
- **GitHub:** github.com/ramsharef1/forge/tree/main/projects/mutabe3
- **Classic Project:** `forge · mutabe3` (claude.ai Projects)

---

## Quick Links

| What | Where |
|------|-------|
| **Current state** | `FACTS.md` |
| **Open decisions** | `PLAN.md` § decisions |
| **Priorities** | `PLAN.md` § priorities |
| **Resume point** | `PLAN.md` § resume |
| **Session log** | `WORKLOG.md` (tail -20) |
| **Tasks from FORGE** | `DISPATCH.md` **## Open** |
| **Completed tasks** | `DISPATCH.md` **## Done** |
| **Implementation plan** | `docs/IMPLEMENTATION_PLAN.md` |
| **Sessions tracking** | `.claude/SESSIONS_OVERVIEW.md` |
| **Prompts library** | `docs/PROMPTS_LIBRARY.md` |
| **Tech decisions** | `tech/COMMANDS.md` (tier forge only) |
| **Connectors** | `connectors/` (Vercel, GitHub, Sentry, Strapi) |

---

## Project Structure

```
mutabe3/
├── mutabe3.md                    ← YOU ARE HERE (front door)
├── FACTS.md                      ← canonical state: URLs, stack, DB, paths
├── PLAN.md                       ← decisions in force, verified state, open ?s
├── WORKLOG.md                    ← session log (newest first)
├── DECISIONS.md                  ← numbered D-log (Rami decisions only)
├── DISPATCH.md                   ← tasks from FORGE (## Open / ## Done)
├── COMMANDS.md                   ← tech command registry (tier forge only)
├── tech/
│   ├── COMMANDS.md               ← tech procedures, build, deploy
│   └── DECISIONS.md              ← tech-specific decisions
├── connectors/
│   ├── production.md             ← Vercel production deployment
│   ├── staging.md                ├─ Vercel staging environment
│   ├── GITHUB.md                 ├─ GitHub credentials and CI/CD
│   ├── SENTRY.md                 ├─ Error tracking setup
│   ├── STRAPI.md                 └─ CMS configuration
│   └── (others as needed)
├── .claude/
│   ├── SESSIONS_OVERVIEW.md      ← 6 sessions tracked, dependencies
│   ├── sessions/01-06/           └─ individual session docs
│   └── settings.json             ← project config
├── docs/
│   ├── IMPLEMENTATION_PLAN.md    ← 11-week roadmap, 6 sessions
│   ├── PROMPTS_LIBRARY.md        ├─ 21 prompts for journalists/editors
│   └── (other docs)
├── packages/
│   ├── frontend/                 ← Next.js public website
│   ├── backend/                  ├─ Node.js API + Strapi
│   ├── admin/                    ├─ Editorial dashboard
│   └── shared/                   └─ Shared types & utilities
└── archive/                      ← superseded files (never deleted)
```

---

## Governance

**Authority:** Rami (owner). Code sessions draft, execute (LAW 3), never destructive without approval.  
**Rules:** See `LAWS.md` in forge root (apply to every project). Specific gates above.  
**Sync:** Changes to this project → `git push` → Classic Project synced via GitHub knowledge.

---

## Status Timeline

- **2026-09-12**: 🔨 Architecture phase started
  - ✅ 6 sessions planned (11-week roadmap)
  - ✅ Prompts library created (21 prompts)
  - ✅ Tech stack locked (Next.js, Node, PostgreSQL, Strapi, Vercel)
  - ⏳ Session 1 (Infrastructure) ready to start this week

---

**Last updated:** 2026-09-12 by Claude  
**Next:** Read `FACTS.md` for current state, then `DISPATCH.md` for open tasks
