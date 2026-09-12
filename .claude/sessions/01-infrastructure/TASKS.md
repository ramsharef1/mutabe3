# Session 1 Tasks: Infrastructure & DevOps

## Week 1 Tasks

### Repository & Project Structure
- [ ] **1.1** Initialize monorepo structure (`packages/` directories)
  - [ ] `packages/frontend` (Next.js)
  - [ ] `packages/backend` (Express/Fastify API)
  - [ ] `packages/admin` (Admin dashboard)
  - [ ] `packages/shared` (shared types & utilities)
  - [ ] Estimated time: 30 min

- [ ] **1.2** Set up `.github/workflows` directory and CI/CD skeleton
  - [ ] Create `workflows/ci.yml` template
  - [ ] Create `workflows/deploy-staging.yml` template
  - [ ] Create `workflows/deploy-production.yml` template
  - [ ] Estimated time: 1 hour

- [ ] **1.3** Create base configuration files
  - [ ] `.env.example` with all required variables
  - [ ] `.gitignore` for Node, Docker, IDE files
  - [ ] `.dockerignore` for efficient builds
  - [ ] `tsconfig.json` and `tsconfig.shared.json`
  - [ ] Estimated time: 45 min

### Docker & Local Development
- [ ] **1.4** Create `docker-compose.yml` for development
  - [ ] Service: Next.js frontend (port 3000)
  - [ ] Service: PostgreSQL (port 5432)
  - [ ] Service: Redis (port 6379)
  - [ ] Service: Strapi CMS (port 1337) — basic config
  - [ ] Network configuration for service communication
  - [ ] Volume mounts for data persistence
  - [ ] Estimated time: 2 hours

- [ ] **1.5** Create `Dockerfile` for production builds
  - [ ] Multi-stage build (builder → runtime)
  - [ ] Optimized for Next.js + Node backend
  - [ ] Non-root user for security
  - [ ] Health check configured
  - [ ] Estimated time: 1.5 hours

- [ ] **1.6** Verify local development environment works
  - [ ] Run `docker-compose up` and test all services start
  - [ ] Test database connection from app
  - [ ] Test Redis connection
  - [ ] Test Strapi CMS admin interface accessible
  - [ ] Estimated time: 30 min

### Database Setup
- [ ] **1.7** Create Prisma schema (`packages/backend/prisma/schema.prisma`)
  - [ ] Define all core models: User, Article, Category, Comment, Subscription
  - [ ] Set up relationships between models
  - [ ] Add indexes for performance (slug, author_id, category_id)
  - [ ] Add enum types (UserRole, ArticleStatus, CommentStatus)
  - [ ] Estimated time: 2.5 hours

- [ ] **1.8** Create initial database migration
  - [ ] Run `prisma migrate dev --name init`
  - [ ] Verify schema matches design
  - [ ] Test migrations can be replayed cleanly
  - [ ] Estimated time: 45 min

- [ ] **1.9** Create seed script (`packages/backend/prisma/seed.ts`)
  - [ ] Seed 5 test users (admin, editor, journalist, viewer, test user)
  - [ ] Seed 3 categories (Politics, Business, Technology)
  - [ ] Seed 10-15 sample articles for testing
  - [ ] Make seed script idempotent (safe to run multiple times)
  - [ ] Estimated time: 1.5 hours

### Hosting & Deployment Setup (Choose One Path)
**Path A: Vercel (Recommended for Next.js)**
- [ ] **1.10A** Set up Vercel project
  - [ ] Create Vercel account/project
  - [ ] Connect GitHub repository
  - [ ] Configure environment variables in Vercel
  - [ ] Set up staging vs. production environments
  - [ ] Estimated time: 1 hour

**Path B: AWS**
- [ ] **1.10B** Set up AWS infrastructure
  - [ ] Create AWS account and configure CLI
  - [ ] Set up RDS PostgreSQL instance
  - [ ] Set up ElastiCache Redis
  - [ ] Set up ECS or EC2 for application
  - [ ] Configure load balancer
  - [ ] Estimated time: 3-4 hours

### Monitoring & Error Tracking
- [ ] **1.11** Set up Sentry for error tracking
  - [ ] Create Sentry account/project
  - [ ] Get Sentry DSN
  - [ ] Add Sentry configuration to backend (`sentry.ts`)
  - [ ] Add Sentry configuration to frontend
  - [ ] Test error capture in local environment
  - [ ] Estimated time: 1 hour

- [ ] **1.12** Create health check endpoint
  - [ ] Implement `GET /api/health` endpoint
  - [ ] Check database connectivity
  - [ ] Check Redis connectivity
  - [ ] Return structured response with status and details
  - [ ] Estimated time: 45 min

## Week 2 Tasks

### CI/CD Pipeline
- [ ] **2.1** Implement GitHub Actions CI pipeline
  - [ ] Trigger on: pull requests to `main` and `develop`
  - [ ] Run tests (unit tests, e2e tests)
  - [ ] Run linting (ESLint, Prettier)
  - [ ] Check TypeScript compilation
  - [ ] Security scanning (OWASP, dependency audits)
  - [ ] Build Docker image and push to registry
  - [ ] Estimated time: 2.5 hours

- [ ] **2.2** Implement staging deployment pipeline
  - [ ] Trigger on: merge to `main` branch
  - [ ] Run full CI checks
  - [ ] Build and push Docker image to registry
  - [ ] Update staging environment with new image
  - [ ] Run smoke tests on staging
  - [ ] Notify team of deployment (Slack integration)
  - [ ] Estimated time: 2 hours

- [ ] **2.3** Implement production deployment pipeline
  - [ ] Trigger on: manual approval OR git tag (v*.*.*)
  - [ ] Require approval from designated reviewer
  - [ ] Run full CI checks
  - [ ] Build and push Docker image to registry
  - [ ] Update production with blue-green deployment (if possible)
  - [ ] Run smoke tests on production
  - [ ] Notify team (Slack) with deployment status
  - [ ] Estimated time: 2.5 hours

### Database Migrations & Backups
- [ ] **2.4** Set up automatic database backups
  - [ ] Daily backup schedule
  - [ ] Backups stored in AWS S3 or equivalent
  - [ ] Retention policy: keep 30 days of backups
  - [ ] Test backup restoration process
  - [ ] Document restore procedure
  - [ ] Estimated time: 1.5 hours

- [ ] **2.5** Document migration process
  - [ ] How to create new migrations
  - [ ] How to deploy migrations to staging/production
  - [ ] How to roll back migrations (if needed)
  - [ ] Estimated time: 30 min

### Logging & Monitoring
- [ ] **2.6** Set up centralized logging (choose one)
  - **Option A: Docker logs + CloudWatch**
    - [ ] Configure Docker logging driver for CloudWatch
    - [ ] Create CloudWatch log groups
  - **Option B: ELK Stack (Elasticsearch, Logstash, Kibana)**
    - [ ] Set up Elasticsearch container
    - [ ] Set up Logstash for log aggregation
    - [ ] Set up Kibana for visualization
  - [ ] Estimated time: 2-3 hours

- [ ] **2.7** Set up performance monitoring
  - [ ] Database query performance monitoring
  - [ ] API response time monitoring
  - [ ] Set up alerts for slow queries/endpoints
  - [ ] Estimated time: 1 hour

### Documentation
- [ ] **2.8** Write comprehensive setup documentation
  - [ ] **`docs/INFRASTRUCTURE.md`**: How to set up local dev environment
  - [ ] **`docs/DEPLOYMENT.md`**: How the CI/CD pipeline works
  - [ ] **`docs/DATABASE_SCHEMA.md`**: Full schema reference with ER diagram
  - [ ] **`docs/TROUBLESHOOTING.md`**: Common issues and fixes
  - [ ] Include screenshots/diagrams where helpful
  - [ ] Test documentation with new team member
  - [ ] Estimated time: 2 hours

- [ ] **2.9** Create quickstart script
  - [ ] Write `scripts/setup.sh` or `npm run setup`
  - [ ] Should be one-command setup for new developers
  - [ ] Copy `.env.example` to `.env.local`
  - [ ] Run `docker-compose up`
  - [ ] Run migrations and seed
  - [ ] Show success message
  - [ ] Estimated time: 45 min

### Final Verification & Handoff
- [ ] **2.10** Comprehensive testing checklist
  - [ ] Local dev environment works perfectly (zero issues)
  - [ ] Docker containers all start without errors
  - [ ] Database migrations run cleanly
  - [ ] Seed data loads correctly
  - [ ] Health check endpoint returns `healthy`
  - [ ] CI/CD pipeline runs successfully
  - [ ] Staging environment deployed and accessible
  - [ ] Monitoring and error tracking working
  - [ ] Can successfully view logs in centralized logging
  - [ ] Estimated time: 1 hour

- [ ] **2.11** Team handoff & knowledge transfer
  - [ ] Walk through setup with Session 2/3 leads
  - [ ] Answer questions and resolve blockers
  - [ ] Ensure they can spin up local environment
  - [ ] Provide shell access/credentials for staging/production
  - [ ] Estimated time: 1 hour

## Success Criteria

Session 1 is complete when:

1. ✅ New developer can run `npm run setup` and have working local environment
2. ✅ All GitHub Actions workflows running successfully
3. ✅ Staging environment deployed and accessible
4. ✅ Health check shows all systems connected (`healthy`)
5. ✅ Database schema matches design document
6. ✅ Monitoring and error tracking verified working
7. ✅ Documentation complete and tested
8. ✅ Team can confidently hand off to Session 2 (CMS) and Session 3 (Frontend)

---

**Total Estimated Time**: ~30-35 hours over 2 weeks  
**Team Size**: 1-2 DevOps/Backend engineers  
**Blockers To Resolve**: Hosting platform, domain, secrets manager setup
