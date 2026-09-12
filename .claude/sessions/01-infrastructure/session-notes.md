# Session 1: Infrastructure & DevOps

**Timeline**: Week 1-2  
**Lead**: DevOps/Backend Engineer  
**Status**: Not Started  
**Start Date**: [To be assigned]  

## Overview

This foundational session sets up all infrastructure, deployment pipelines, database schema, and monitoring. Nothing can be deployed or tested without this foundation.

## Key Deliverables

### By End of Week 1
- [ ] Git repository initialized with monorepo structure
- [ ] Docker setup (development environment)
- [ ] Database schema designed in Prisma
- [ ] PostgreSQL containerized and running locally
- [ ] Redis cache configured for development
- [ ] Environment configuration (`.env.example` created)

### By End of Week 2
- [ ] CI/CD pipeline with GitHub Actions (test → deploy → staging)
- [ ] Staging environment deployed to hosting platform
- [ ] Database migrations setup with version control
- [ ] Monitoring and logging configured (Sentry, health checks)
- [ ] Documentation for running dev environment
- [ ] Team can spin up full dev stack with one command

## Technical Stack

- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Database**: PostgreSQL (primary) + Redis (caching)
- **Hosting**: [Vercel for Next.js OR AWS for full control] — **TBD**
- **Monitoring**: Sentry (error tracking) + custom health checks
- **Secrets Management**: Environment variables (local) + [AWS Secrets Manager OR similar]

## Critical Files to Create

```
mutabe3/
├── docker-compose.yml              # Local dev stack (Next.js, PostgreSQL, Redis, Strapi)
├── Dockerfile                       # Multi-stage builds for production
├── .dockerignore
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Run tests on PR
│       ├── deploy-staging.yml      # Deploy to staging
│       └── deploy-production.yml   # Deploy to production
├── packages/backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   └── migrations/             # Database version control
│   └── src/
│       ├── middleware/auth.ts      # Authentication middleware
│       └── middleware/logging.ts   # Request logging
├── .env.example                    # Template for environment variables
├── .env.local                      # Local dev secrets (not in git)
└── docs/
    ├── INFRASTRUCTURE.md           # Setup guide
    ├── DATABASE_SCHEMA.md          # ER diagram & schema docs
    └── DEPLOYMENT.md               # CI/CD and deployment guide
```

## Database Schema Overview

### Core Tables

**articles**
- id (UUID, primary key)
- title (string)
- slug (string, unique, for URLs)
- content (rich text/JSON)
- summary (string)
- featured_image_url (string)
- author_id (foreign key → users)
- category_id (foreign key → categories)
- status (enum: draft, published, scheduled, archived)
- published_at (timestamp, nullable)
- scheduled_publish_at (timestamp, nullable)
- created_at (timestamp)
- updated_at (timestamp)
- seo_keywords (string array or JSON)
- views_count (integer, for trending)

**users** (journalists, editors, admins)
- id (UUID)
- email (string, unique)
- name (string)
- role (enum: admin, editor, journalist, viewer)
- password_hash (string)
- created_at (timestamp)
- updated_at (timestamp)

**categories**
- id (UUID)
- name (string, AR)
- slug (string, unique)
- description (text)
- image_url (string)
- display_order (integer)

**comments**
- id (UUID)
- article_id (foreign key)
- user_id (foreign key, nullable for anonymous)
- content (text)
- status (enum: pending, approved, rejected)
- created_at (timestamp)

**subscriptions**
- id (UUID)
- email (string)
- status (enum: active, unsubscribed)
- subscribed_at (timestamp)
- category_preferences (JSON array)

See `docs/DATABASE_SCHEMA.md` for full ER diagram and relationships.

## Dependencies & Blockers

**Must Complete Before**:
- Session 2 (CMS) can start after basic DB schema is ready
- Session 3 (Frontend) can start after API contracts are defined
- Session 4+ all depend on this being stable

**External Blockers**:
- [ ] Hosting platform selected and configured
- [ ] Domain registered (if known)
- [ ] SSL certificates arranged
- [ ] Secrets manager access granted (for CI/CD)

## Deployment Strategy

### Development (Local)
```bash
docker-compose up
# Starts: Next.js (port 3000), Strapi (port 1337), PostgreSQL, Redis
```

### Staging
- Deployed from `main` branch
- Updated on every merge to main
- Uses staging database (separate from production)
- All team can access at `staging.mutabe3.com`

### Production
- Deployed from tagged releases (`v1.0.0`, etc.)
- Manual approval required
- Separate production database
- Full monitoring enabled

## Local Development Setup

### Prerequisites
- Docker Desktop installed and running
- Node.js 18+ (for local scripts)
- Git configured

### First-Time Setup
```bash
# Clone and setup
git clone <repo>
cd mutabe3
cp .env.example .env.local

# Start dev environment
docker-compose up

# Run migrations
npm run db:migrate

# Seed sample data
npm run db:seed

# Verify setup
npm run health-check
# Should show: PostgreSQL ✅, Redis ✅, API ✅
```

## Environment Variables

See `.env.example` for complete list. Key variables:

```
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/mutabe3
REDIS_URL=redis://redis:6379

# API & Auth
JWT_SECRET=your-secret-key
API_BASE_URL=http://localhost:3000

# CMS
STRAPI_URL=http://strapi:1337

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=debug (dev) or info (prod)

# Hosting
VERCEL_TOKEN=... (if using Vercel)
AWS_ACCESS_KEY_ID=... (if using AWS)
```

## Monitoring & Health Checks

### Health Check Endpoint
```
GET /api/health

Response:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-09-12T10:00:00Z"
}
```

### Error Tracking (Sentry)
- All unhandled errors automatically captured
- Errors sent to Sentry dashboard
- Alerts configured for critical errors

### Logs
- Docker logs: `docker-compose logs -f`
- Application logs saved to `/logs/` directory
- Centralized logging setup (recommended: ELK stack or Datadog)

## Performance Baselines

Target metrics for launch readiness:

- Database query response: < 100ms (p95)
- API endpoint response: < 200ms (p95)
- Docker image build: < 5 minutes
- Full deployment cycle: < 15 minutes
- Site load time (Core Web Vitals): < 3 seconds (LCP)

## Team Handoff Checklist

Before handing off to other sessions:

- [ ] All Docker containers working locally without errors
- [ ] Database migrations run successfully
- [ ] API health check passes
- [ ] CI/CD pipeline running tests successfully
- [ ] Staging environment accessible and working
- [ ] Documentation complete and tested (can a new team member follow it?)
- [ ] All environment variables documented
- [ ] Monitoring and error tracking working
- [ ] Database backup strategy implemented

## Questions & Decisions Needed

**TBD - Make Decisions Before Starting**:
1. [ ] Hosting platform: Vercel vs. AWS vs. DigitalOcean?
2. [ ] Domain name: What's the production domain?
3. [ ] Secrets manager: AWS Secrets vs. HashiCorp Vault vs. environment variables?
4. [ ] Monitoring/logging: Sentry + CloudWatch or full ELK stack?
5. [ ] Database backups: Daily? Hourly? Where stored?
6. [ ] CI/CD approval process: Automatic staging deploy? Manual production approval?

## Related Documentation

- `docs/INFRASTRUCTURE.md` — Detailed setup guide
- `docs/DEPLOYMENT.md` — CI/CD pipeline documentation
- `docs/DATABASE_SCHEMA.md` — Full schema reference

## Resources

- Docker Documentation: https://docs.docker.com/
- Prisma ORM: https://www.prisma.io/docs/
- GitHub Actions: https://docs.github.com/en/actions
- PostgreSQL: https://www.postgresql.org/docs/
- Redis: https://redis.io/docs/

---

**Next Sessions Waiting On**:
- Session 2: CMS integration needs database and hosting ready
- Session 3: Frontend needs API contracts and deployment pipeline
- Session 4+: All depend on stable infrastructure

**Last Updated**: 2026-09-12
