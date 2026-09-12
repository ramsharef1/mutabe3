# Mutabe3 — Jordanian News Agency Platform

A full-stack, modern news agency website optimized for the Jordanian market with Arabic-first design, SEO excellence, and editorial workflows.

## Quick Start

```bash
# Setup environment
git clone <repo>
cd mutabe3

# Install dependencies (when available)
npm install

# Start development
npm run dev

# Build production
npm run build
```

## Tech Stack

- **Frontend**: Next.js 14+ (App Router) with next-intl for i18n
- **Backend**: Node.js with Express/Fastify or Next.js API routes
- **CMS**: Strapi (self-hosted headless CMS)
- **Database**: PostgreSQL + Redis caching
- **Search**: Meilisearch (Arabic-aware)
- **Hosting**: Vercel or AWS
- **CDN**: Cloudflare
- **Analytics**: Google Analytics 4 + Sentry for monitoring

## Project Structure

```
mutabe3/
├── packages/
│   ├── frontend/         # Next.js public-facing website
│   ├── backend/          # Backend API & CMS integration
│   ├── admin/            # Editorial dashboard
│   └── shared/           # Shared utilities & types
├── docs/                 # Documentation & guides
├── .claude/              # Claude Code project settings
│   └── sessions/         # Session-specific notes
├── CLAUDE.md             # Master project document
└── README.md             # This file
```

## Work Sessions

The project is organized into 6 parallel/sequential sessions. Each session is independently scoped with clear deliverables.

### 1. Infrastructure & DevOps (Week 1-2)
Setting up Git, Docker, CI/CD, database schema, and monitoring infrastructure.
- **Lead**: DevOps/Backend Engineer
- **Status**: Not started
- **Details**: See `.claude/sessions/01-infrastructure.md`

### 2. Content Management System (Week 1-3)
Building the Strapi headless CMS with article content models, roles, and publishing workflows.
- **Lead**: Backend/CMS Engineer
- **Status**: Not started
- **Details**: See `.claude/sessions/02-cms.md`

### 3. Frontend Foundation & Design System (Week 2-5)
Next.js setup with RTL support, component library, and design tokens for Arabic.
- **Lead**: Frontend/Design Engineer
- **Status**: Not started
- **Details**: See `.claude/sessions/03-frontend.md`

### 4. Homepage & Article Display (Week 4-6)
Building the public-facing website with articles, categories, search, and SEO.
- **Lead**: Full-stack Developer
- **Status**: Not started
- **Details**: See `.claude/sessions/04-content.md`

### 5. Admin Dashboard & Editorial Workflows (Week 5-8)
Building the journalist-facing dashboard for content management and analytics.
- **Lead**: Full-stack Developer
- **Status**: Not started
- **Details**: See `.claude/sessions/05-admin.md`

### 6. Search, Performance & Launch (Week 7-11)
Implementing search, performance optimization, analytics, and launch preparation.
- **Lead**: Frontend/DevOps Engineer
- **Status**: Not started
- **Details**: See `.claude/sessions/06-launch.md`

## Critical Dependencies

```
Week 1-2:  [Session 1: Infrastructure] ——————
           [Session 2: CMS] —————————
Week 3-4:  [Session 3: Frontend] ————————————
Week 5-6:  [Session 4: Homepage/Articles] ————
           [Session 5: Admin Dashboard] ——————————
Week 7-11: [Session 6: Search/Performance/Launch] ————————
```

**Blocking Path**:
- Session 1 must complete before any deployment
- Sessions 2 & 3 can overlap but need API contracts early
- Session 4 requires Sessions 2 & 3
- Session 5 needs Sessions 1 & 2
- Session 6 integrates all previous work

## Getting Involved

### For Team Members
1. Read this README for project overview
2. Check your assigned session folder in `.claude/sessions/`
3. Review the detailed session notes and deliverables
4. Follow the session-specific README and setup instructions

### Running Your Session
Each session has:
- `session-notes.md` — Context, deliverables, dependencies
- `TASKS.md` — Specific work items and checklist
- `setup.md` — Environment and dependency setup
- `README.md` — Technical implementation guide

## Key Principles

1. **SEO-First**: News content must rank well in search results
2. **Performance**: Optimize for mobile networks in the Middle East
3. **RTL-Ready**: Full Arabic support from day one
4. **Editorial Workflow**: Support multi-author review and scheduling
5. **Analytics-Driven**: Track engagement and optimize content
6. **Scalable**: Handle traffic spikes during major news events

## Important: Arabic & Jordanian Market Considerations

- **Text Handling**: Always use RTL-aware layouts; test with Arabic fonts
- **SEO**: Implement hreflang tags for Arabic/English; use NewsArticle schema
- **Performance**: Use CDN with Middle East presence; optimize for 4G
- **Content**: Design moderation tools for comments; add version control for corrections
- **Privacy**: Ensure GDPR/local privacy law compliance

## Contributing

1. Claim or be assigned a session
2. Create a feature branch: `git checkout -b session/<number>-<name>`
3. Follow the session's TASKS.md checklist
4. Push regularly: `git push origin session/<number>-<name>`
5. Create PRs with session reference and completed task checklist

## Project Status

- **Phase**: Architecture & Planning
- **Start Date**: 2026-09-12
- **Target Launch**: ~11 weeks from infrastructure start

## Team

- **Project Lead**: Rami Alsharef (ramsharef@gmail.com)

## Documentation

- [Full Implementation Plan](./docs/IMPLEMENTATION_PLAN.md) (detailed)
- [Tech Stack Guide](./docs/TECH_STACK.md) (reference)
- [Arabic/RTL Implementation Guide](./docs/ARABIC_RTL_GUIDE.md) (guidelines)
- [Database Schema](./docs/DATABASE_SCHEMA.md) (ER diagram)

## Questions?

Check the [FAQ](./docs/FAQ.md) or ask in the project Slack channel.

---

**Master Session**: mutabe3-master  
**Last Updated**: 2026-09-12  
**Status**: 🏗️ Architecture Phase
