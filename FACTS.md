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
| **Staging URL** | https://mutabe3.vercel.app | TBD | — |
| **Production URL** | TBD | ⬜ | — |
| **DNS provider** | TBD | ⬜ | — |

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
| **Current commit** | `4211e35` (Initial project setup) | 2026-09-12 |
| **Staging branch** | TBD | ⬜ |
| **Production branch** | TBD | ⬜ |

## Credentials & Secrets

| Service | Credential | Status | Location | Date |
|---------|-----------|--------|----------|------|
| **Vercel** | API token | ⬜ TBD | `.claude/secrets/` or forge secrets | — |
| **Sentry** | DSN | ⬜ TBD | `.env` files | — |
| **Strapi** | API key | ⬜ TBD | `.env` files | — |
| **GitHub** | SSH key | ✅ Ready | `~/.ssh/id_rsa` (existing) | 2026-09-12 |
| **PostgreSQL** | Connection string | ⬜ TBD | `.env` files | — |

## Project Files & Paths

| File/Folder | Purpose | Status | Date |
|------------|---------|--------|------|
| `FACTS.md` | This file (canonical state) | ✅ Created | 2026-09-12 |
| `PLAN.md` | Decisions, priorities, resume point | ⬜ TBD | — |
| `WORKLOG.md` | Session log (newest first) | ⬜ TBD | — |
| `DECISIONS.md` | Numbered decision log | ⬜ TBD | — |
| `DISPATCH.md` | Tasks from FORGE | ⬜ TBD | — |
| `COMMANDS.md` | Tech procedures (tier forge only) | ⬜ TBD | — |
| `docs/IMPLEMENTATION_PLAN.md` | 11-week roadmap, 6 sessions | ✅ Created | 2026-09-12 |
| `docs/PROMPTS_LIBRARY.md` | 21 prompts for journalists/editors | ✅ Created | 2026-09-12 |
| `packages/frontend/` | Next.js app | ⬜ TBD (scaffolding) | — |
| `packages/backend/` | Node.js API | ⬜ TBD (scaffolding) | — |
| `packages/admin/` | Editorial dashboard | ⬜ TBD (scaffolding) | — |
| `.claude/SESSIONS_OVERVIEW.md` | 6 sessions tracked | ✅ Created | 2026-09-12 |
| `.claude/sessions/01-infrastructure/` | Session 1 docs | ✅ Created | 2026-09-12 |

## Databases & Services

| Service | Status | Connection | Port | Credentials |
|---------|--------|-----------|------|-------------|
| **PostgreSQL (Vercel)** | ⬜ TBD | `postgresql://...` | 5432 | TBD |
| **PostgreSQL (local dev)** | ⬜ Pending Docker setup | `localhost:5432` | 5432 | `docker-compose.yml` |
| **Redis (local dev)** | ⬜ Pending Docker setup | `localhost:6379` | 6379 | Docker |
| **Strapi (local dev)** | ⬜ Pending Docker setup | `localhost:1337` | 1337 | Docker |
| **Strapi (production)** | ⬜ TBD | TBD | TBD | TBD |

## Environment Configuration

| Variable | Purpose | Status | Location |
|----------|---------|--------|----------|
| `DATABASE_URL` | PostgreSQL connection | ⬜ TBD | `.env.local`, Vercel |
| `REDIS_URL` | Redis cache | ⬜ TBD | `.env.local` (dev only) |
| `JWT_SECRET` | API authentication | ⬜ TBD | `.env`, vault |
| `SENTRY_DSN` | Error tracking | ⬜ TBD | `.env`, Vercel |
| `STRAPI_URL` | CMS API endpoint | ⬜ TBD | `.env` |
| `NEXT_PUBLIC_API_URL` | Frontend API base | ⬜ TBD | `.env.local` |

## Team & Ownership

| Role | Person | Email | Status | Date |
|------|--------|-------|--------|------|
| **Project Lead** | Rami Alsharef | ramsharef@gmail.com | ✅ Assigned | 2026-09-12 |
| **Session 1 Lead** | Rami Alsharef | ramsharef@gmail.com | ✅ Assigned | 2026-09-12 |
| **Session 2 Lead** | TBD | — | ⬜ Pending | — |
| **Session 3 Lead** | TBD | — | ⬜ Pending | — |
| **Session 4 Lead** | TBD | — | ⬜ Pending | — |
| **Session 5 Lead** | TBD | — | ⬜ Pending | — |
| **Session 6 Lead** | TBD | — | ⬜ Pending | — |

## Project Status

| Milestone | Status | Date |
|-----------|--------|------|
| Architecture phase | ✅ Complete | 2026-09-12 |
| 6 sessions planned | ✅ Complete | 2026-09-12 |
| Prompts library | ✅ Complete | 2026-09-12 |
| Forge structure setup | 🔨 In progress | 2026-09-12 |
| Session 1 kickoff | ⏳ Ready to start this week | 2026-09-12 |
| MVP launch | ⏳ ~11 weeks from Session 1 start | TBD |
| Production launch | ⏳ ~14-16 weeks from Session 1 start | TBD |

## Important Links & References

| Link | Purpose |
|------|---------|
| `docs/IMPLEMENTATION_PLAN.md` | Full 11-week roadmap with all 6 sessions |
| `.claude/SESSIONS_OVERVIEW.md` | Session tracking and dependencies |
| `docs/PROMPTS_LIBRARY.md` | 21 AI prompts for newsroom use |
| `PLAN.md` § decisions | Locked decisions for this project |
| `/forge/FORGE.md` | Project governance model |
| `/forge/LAWS.md` | Rules that apply to all forge projects |
| `/forge/controllers/tech/STACK-NEXT.md` | Next.js standards |
| `/forge/controllers/tech/DEPLOY-VERCEL.md` | Vercel deployment procedures |

---

**Last updated:** 2026-09-12 by Claude  
**Next to fill in:** `PLAN.md` (decisions, state, priorities), `DISPATCH.md` (open tasks)
