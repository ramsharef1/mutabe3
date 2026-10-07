# MUTABE3 — Session Loader

**Shortcut for Claude Code sessions in mutabe3 project.**

---

## Quick Reference

| What | Where |
|------|-------|
| **Front door** | Read `mutabe3.md` first (governance, URLs, structure) |
| **Current state** | `FACTS.md` (canonical source of truth) |
| **Decisions** | `PLAN.md` (§ decisions) + `DECISIONS.md` (numbered log) |
| **My work** | `DISPATCH.md` (open tasks) |
| **Resume point** | `PLAN.md` (§ resume point, verified state) |
| **Session log** | `WORKLOG.md` (tail -5 to see recent turns) |

---

## Project

**mutabe3** — Jordanian news agency platform

- **Status:** 🔨 Architecture phase → Session 1 (Infrastructure) ready to start
- **Stack:** Next.js, Node.js, PostgreSQL, Strapi, Vercel
- **Owner:** Rami Alsharef
- **Tier:** forge (Code session + Classic brain)

---

## Sessions (6 Total)

1. **Infrastructure & DevOps** (Week 1-2) — Rami — 🟠 Not started, ready to go
2. **CMS Implementation** (Week 1-3) — TBD — 🟠 Waiting for Session 1
3. **Frontend Foundation** (Week 2-5) — TBD — 🟠 Waiting for Session 1
4. **Homepage & Articles** (Week 4-6) — TBD — 🟠 Waiting for Sessions 2&3
5. **Admin Dashboard** (Week 5-8) — TBD — 🟠 Waiting for Sessions 1&2
6. **Search & Launch** (Week 7-11) — TBD — 🟠 Waiting for Sessions 1-5

See `.claude/SESSIONS_OVERVIEW.md` for full session tracking.

---

## Docs

- **Roadmap:** `docs/IMPLEMENTATION_PLAN.md` (11 weeks, 6 sessions, detailed)
- **Prompts:** `docs/PROMPTS_LIBRARY.md` (21 prompts for journalists/editors)
- **Sessions:** `.claude/SESSIONS_OVERVIEW.md` + `.claude/sessions/NN-*/`

---

## Governance

- **Laws:** See `/forge/LAWS.md` (all projects follow these)
- **This project:** `mutabe3.md` (front door), `FACTS.md` (state), `PLAN.md` (decisions)
- **Symlink:** `~/.claude/groups/mutabe3` → `/Projects/forge/projects/mutabe3`

---

## If You're Starting Session 1

1. Read `mutabe3.md` (front door, 5 min)
2. Read `FACTS.md` to see current state (2 min)
3. Read `PLAN.md` § "Resume Point" (2 min)
4. Check `DISPATCH.md` for your task (1 min)
5. Read detailed session docs in `.claude/sessions/01-infrastructure/`

**Total: 10 min orientation, then start work.**

---

## Commands (from ~/Projects/forge/projects/mutabe3/)

```bash
# Show recent work
tail -20 WORKLOG.md

# See open tasks
grep -A 5 "## Open" DISPATCH.md

# Quick facts
head -20 FACTS.md

# Full front door
cat mutabe3.md
```

---

**Last updated:** 2026-09-12  
**Next:** See `mutabe3.md` and `DISPATCH.md` for what to do
