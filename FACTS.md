# mutabe3 · FACTS

**Canonical state.** Every row is dated or ⬜ (blank = to be determined). Update this as facts change; link from PLAN, DECISIONS, connectors.

---

## Deployment & Hosting

| Fact | Value | Date | Verified |
|------|-------|------|----------|
| **Hosting platform** | Self-hosted VPS (forge shared) | 2026-09-16 | ✅ |
| **VPS Host** | 72.62.132.138 (srv1772644.hstgr.cloud, Hostinger) | 2026-09-16 | ✅ |
| **VPS OS** | AlmaLinux + AdminBolt | 2026-09-16 | ✅ |
| **Frontend Port** | 9100 (Next.js production build) | 2026-09-16 | ✅ |
| **Backend Port** | 9080 (Express API) | 2026-09-16 | ✅ |
| **Reverse Proxy** | nginx (port 443 HTTPS, 80 HTTP) | 2026-09-16 | ✅ |
| **SSH** | `ssh root@72.62.132.138` | 2026-09-16 | ✅ |
| **Database** | PostgreSQL :5432 on VPS | 2026-09-16 | ✅ |
| **Redis** | Not used (optional) | ⬜ | — |
| **Production Domain** | https://mutabe3.news | 2026-09-16 | ✅ |
| **Alias Domain** | mutabe3.hstgr.cloud | 2026-09-16 | ✅ |
| **SSL Certificate** | Let's Encrypt (valid until 2026-12-15) | 2026-09-16 | ✅ |

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
| **Project Lead** | Rami Alsharef | ramsharef@gmail.com | ✅ | All | 2026-09-16 |
| **Environment** | Claude Code (Session 3+) | — | ✅ | All 3+ | 2026-09-16 |

## Project Status & Milestones

| Milestone | Status | Date |
|-----------|--------|------|
| **Infrastructure setup** | ✅ Complete | 2026-09-12 |
| **VPS deployment** | ✅ Complete | 2026-09-16 |
| **Domain & SSL** | ✅ Complete | 2026-09-16 |
| **Production live** | ✅ Live at mutabe3.news | 2026-09-16 |
| **Database & API** | ✅ Running | 2026-09-16 |
| **Vercel removed** | ✅ Complete | 2026-09-16 |
| **Phase 2: Ammon-replica homepage** | ✅ Live (D-034) | 2026-09-17 |
| **Phase 2: Article + category templates** | ✅ Live at /article/[id], /category/[slug] (D-034) | 2026-09-17 |
| **Phase 3: Real content, search, CMS** | ⏳ Next | — |

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
