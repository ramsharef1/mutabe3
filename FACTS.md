# mutabe3 · FACTS

**Canonical state.** Every row is dated or ⬜ (blank = to be determined). Update this as facts change; link from PLAN, DECISIONS, connectors.

---

## Deployment & Hosting

| Fact | Value | Date | Verified |
|------|-------|------|----------|
| **Hosting platform** | Vercel | 2026-09-12 | ✅ |
| **Database host** | Vercel Postgres | 2026-09-12 | ✅ |
| **CDN** | Cloudflare | 2026-09-12 | ✅ |
| **Staging domain** | mutabe3.vercel.app | 2026-09-12 | ✅ |
| **Production domain** | TBD (migrate to .jo or .com after MVP) | ⬜ | — |

## Tech Stack

| Component | Choice | Version | Date | Notes |
|-----------|--------|---------|------|-------|
| **Frontend** | Next.js | 14+ | 2026-09-12 | App Router, i18n (next-intl), RTL support (twrtl) |
| **Backend** | Node.js + Express/Fastify | 18+ | 2026-09-12 | Or use Next.js API routes |
| **CMS** | Strapi | Self-hosted | 2026-09-12 | Headless CMS for article management |
| **Database** | PostgreSQL | Latest | 2026-09-12 | Via Vercel Postgres |
| **ORM** | Prisma | Latest | 2026-09-12 | Type-safe database access |
| **Cache** | Redis | Latest | TBD | Article rankings, sessions, search suggestions |
| **Search** | Meilisearch | Latest | TBD | Arabic-aware full-text search |
| **Monitoring** | Sentry | Latest | TBD | Error tracking and observability |
| **Analytics** | Google Analytics 4 | Latest | TBD | Reader engagement tracking |
| **CI/CD** | GitHub Actions | — | TBD | Automated testing, building, deployment |

## Repository

| Fact | Value | Date |
|------|-------|------|
| **Local path** | `/Users/ramialsharef/Projects/forge/projects/mutabe3/` | 2026-09-12 |
| **GitHub repo** | github.com/ramsharef1/forge (monorepo) | 2026-09-12 |
| **GitHub path** | `projects/mutabe3/` | 2026-09-12 |
| **Main branch** | `main` | 2026-09-12 |
| **Current commit** | `a1cabba` (forge: finalize naming) | 2026-09-12 |

## Team & Ownership

| Role | Person | Email | Status | Sessions | Date |
|------|--------|-------|--------|----------|------|
| **Project Lead** | Rami Alsharef | ramsharef@gmail.com | ✅ | All 6 | 2026-09-12 |
| **Session 1 Lead** | Rami Alsharef | ramsharef@gmail.com | ✅ | Infrastructure & DevOps | 2026-09-12 |
| **Session 2 Lead** | Rami Alsharef | ramsharef@gmail.com | ✅ | CMS Implementation | 2026-09-12 |
| **Session 3 Lead** | Rami Alsharef | ramsharef@gmail.com | ✅ | Frontend Foundation | 2026-09-12 |
| **Session 4 Lead** | Rami Alsharef | ramsharef@gmail.com | ✅ | Homepage & Articles | 2026-09-12 |
| **Session 5 Lead** | Rami Alsharef | ramsharef@gmail.com | ✅ | Admin Dashboard | 2026-09-12 |
| **Session 6 Lead** | Rami Alsharef | ramsharef@gmail.com | ✅ | Search & Launch | 2026-09-12 |

## Project Status & Milestones

| Milestone | Status | Date |
|-----------|--------|------|
| **Architecture phase** | ✅ Complete | 2026-09-12 |
| **6 sessions planned** | ✅ Complete | 2026-09-12 |
| **Prompts library** | ✅ Complete | 2026-09-12 |
| **Forge structure** | ✅ Complete | 2026-09-12 |
| **All decisions locked** | ✅ Complete | 2026-09-12 |
| **Session 1 ready** | ✅ Ready to start | 2026-09-12 |
| **Environment setup** | ⏳ Pending (Vercel, Sentry, GitHub) | — |
| **MVP launch** | ⏳ ~11-14 weeks from Session 1 start | TBD |

## Key Decisions Locked

| # | Decision | Status |
|---|----------|--------|
| D-1 | Tech stack (Next.js, Strapi, Vercel, PostgreSQL) | ✅ |
| D-2 | 6 sessions with dependencies | ✅ |
| D-3 | Forge governance model | ✅ |
| D-7 | Budget: Start lean, scale as needed | ✅ |
| D-8 | Team: Rami leads all 6 sessions solo | ✅ |
| D-9 | Timeline: 11-14 weeks, priority-driven | ✅ |
| D-10 | MVP Scope: All 6 sessions required | ✅ |
| D-11 | Start Session 1: This week | ✅ |

---

**Last updated:** 2026-09-12  
**Status:** Ready to start Session 1 ✅  
**Next:** Environment setup (Vercel token, Sentry DSN, GitHub Actions secrets)
