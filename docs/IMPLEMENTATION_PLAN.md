# Mutabe3 Implementation Plan

**Comprehensive strategic roadmap for building a full-stack Jordanian news agency website.**

Generated: 2026-09-12  
Status: Architecture Phase

---

## Executive Summary

Mutabe3 is a full-stack, modern news agency website optimized for the Jordanian market. This plan breaks the project into 6 parallel/sequential work sessions over ~11 weeks, with clear deliverables, dependencies, and success criteria.

### Key Numbers
- **Estimated Timeline**: 11 weeks (fast track with parallel work)
- **Realistic Timeline**: 14-16 weeks (with contingency)
- **Team Size**: 4-6 people (1-2 per major session)
- **Sessions**: 6 parallel/sequential work streams
- **Core Tech Stack**: Next.js, Node.js, PostgreSQL, Strapi CMS, Docker, GitHub Actions

---

## TECH STACK RECOMMENDATION

### Frontend
- **Framework**: Next.js 14+ (App Router)
  - Built-in i18n support for Arabic/English
  - Server-side rendering for SEO advantage
  - Static generation for news archives
  - Image optimization for media-heavy content
  - API routes for backend integration
- **Styling**: TailwindCSS + CSS-in-JS (RTL support)
- **RTL Support**: next-intl library + twrtl
- **Rich Text Editor**: TipTap or Lexical (structured content editing)

### Backend
- **Runtime**: Node.js with Express/Fastify
- **CMS**: Strapi (self-hosted, full control, structured content)
- **ORM**: Prisma (type-safe database access)
- **Authentication**: JWT-based with role-based access control

### Database & Caching
- **Primary DB**: PostgreSQL (reliability, JSONB support, full-text search)
- **Caching**: Redis (article rankings, sessions, search suggestions)
- **Search Engine**: Meilisearch (Arabic-aware full-text search)

### Infrastructure & Deployment
- **Hosting**: Vercel (Next.js optimized) OR AWS (more control)
- **Database**: Managed PostgreSQL (AWS RDS or similar)
- **File Storage**: AWS S3 or Cloudinary (image optimization + CDN)
- **CDN**: Cloudflare (Middle East presence, security)
- **CI/CD**: GitHub Actions

### Monitoring & Analytics
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics 4 (or Plausible Analytics)
- **Performance**: Web Vitals monitoring
- **Logging**: CloudWatch or ELK Stack

---

## CORE FEATURES BY PHASE

### Phase 1: MVP (Weeks 4-6)
- Article publishing (create, edit, publish, schedule)
- Homepage news feed (latest, by category)
- Category/topic organization
- Search functionality (basic)
- Mobile responsive design
- Arabic + English support

### Phase 2: Engagement (Weeks 6-8)
- Comments system
- Social sharing
- Article bookmarking
- Newsletter subscriptions
- Related articles widget

### Phase 3: Editorial Suite (Weeks 5-8)
- Admin dashboard
- Journalist workflows (drafts, revisions, approval)
- Editorial calendar
- Contributor management
- Role-based access control

### Phase 4: Discovery & Analytics (Weeks 8-10)
- Advanced search with filters
- SEO metadata management
- Analytics dashboard (traffic, engagement, trending)
- Trending/most-read sections
- Personalization

### Phase 5: Growth (Post-Launch)
- Subscriptions/paywall (optional)
- Personalization engine
- Mobile app (React Native/Flutter)
- API for third-party integration

---

## PROJECT PHASES & TIMELINE

| Phase | Timeline | Duration | Focus | Deliverable |
|-------|----------|----------|-------|-------------|
| **Setup** | Week 1-2 | 2w | Infrastructure, DevOps, CI/CD | Deployed staging env |
| **CMS & Content** | Week 1-3 | 3w | Strapi setup, content models, APIs | CMS with 50+ articles |
| **Frontend** | Week 2-5 | 4w | Next.js, components, design system | Component library ready |
| **Public Site** | Week 4-6 | 3w | Articles, homepage, categories | Publishable homepage |
| **Editorial Tools** | Week 5-8 | 4w | Admin dashboard, workflows | Journalists can publish |
| **Launch** | Week 7-11 | 5w | Search, performance, analytics | Ready for public launch |

**Total Duration**: ~11 weeks (with parallel work)

---

## WORK SESSIONS: DETAILED BREAKDOWN

### Session 1: Infrastructure & DevOps (Week 1-2)

**Ownership**: DevOps/Backend Lead  
**Estimated Effort**: 30-35 hours  
**Deliverables**:
- Git monorepo structure
- Docker containerization (Next.js, PostgreSQL, Redis, Strapi)
- CI/CD pipeline (GitHub Actions)
- Environment configuration and secrets management
- Database schema (Prisma)
- Monitoring setup (Sentry)
- Staging environment deployed

**Critical Files**:
- `docker-compose.yml` (local dev stack)
- `.github/workflows/` (CI/CD pipelines)
- `packages/backend/prisma/schema.prisma` (database schema)
- `.env.example` (configuration template)

**Dependencies**: None (start immediately)  
**Blocking**: Sessions 2, 3, 4, 5, 6

---

### Session 2: CMS Implementation (Week 1-3)

**Ownership**: Backend/CMS Lead  
**Estimated Effort**: 25-30 hours  
**Deliverables**:
- Strapi CMS fully configured
- Content models (Article, Author, Category, Comment, Subscription)
- User roles (Admin, Editor, Journalist, Viewer)
- Publishing workflows (draft → review → publish → scheduled)
- REST/GraphQL APIs for frontend
- Seed data: 50+ sample articles
- Documentation for journalists

**Critical Files**:
- `packages/backend/strapi/` (CMS configuration)
- Content type definitions
- API middleware (auth, caching, rate limiting)
- Seed data scripts

**Dependencies**: Session 1 (database, hosting)  
**Blocking**: Sessions 3, 4, 5, 6

---

### Session 3: Frontend Foundation & Design System (Week 2-5)

**Ownership**: Frontend/Design Lead  
**Estimated Effort**: 30-40 hours  
**Deliverables**:
- Next.js project setup with next-intl
- RTL support (TailwindCSS + twrtl)
- Component library (30-50 components)
- Design system tokens (colors, typography, spacing)
- Layout templates (homepage, article, category, admin)
- Responsive breakpoints (mobile-first)
- Dark mode support
- Storybook documentation

**Critical Files**:
- `packages/frontend/next.config.js` (i18n setup)
- `packages/frontend/tailwind.config.js` (RTL config)
- `packages/frontend/src/components/` (component library)
- `packages/frontend/src/layouts/` (page templates)

**Dependencies**: Session 1 (deployment pipeline)  
**Parallel**: Can start when database schema ready  
**Blocking**: Sessions 4, 5, 6

---

### Session 4: Homepage & Article Display (Week 4-6)

**Ownership**: Full-stack Developer  
**Estimated Effort**: 25-30 hours  
**Deliverables**:
- Homepage feed (latest articles, filtering)
- Article detail pages with rich text
- Category/topic pages with filtering
- Author pages
- Search results page (before advanced search)
- Related articles sidebar
- SEO optimization (meta tags, OpenGraph, schema.org)
- Social sharing buttons
- Comments section (Disqus or custom)

**Critical Files**:
- `packages/frontend/src/app/` (Next.js routing)
- `packages/frontend/src/components/` (page components)
- `packages/frontend/src/lib/cms-client.ts` (API integration)
- SEO middleware and utilities

**Dependencies**: Sessions 2 & 3  
**Blocking**: Session 6

---

### Session 5: Admin Dashboard & Editorial Workflows (Week 5-8)

**Ownership**: Full-stack Developer  
**Estimated Effort**: 30-40 hours  
**Deliverables**:
- Admin authentication and role-based access control
- Article management (CRUD, publish, schedule)
- Category management
- Author/contributor management
- Analytics dashboard (views, engagement, trending)
- Editorial calendar (scheduled posts)
- Content moderation (comments approval)
- User subscription management
- Admin component library

**Critical Files**:
- `packages/admin/src/pages/` (admin routes)
- `packages/admin/src/components/` (admin components)
- `packages/backend/src/middleware/auth.ts` (authentication)
- Admin API routes and permissions

**Dependencies**: Sessions 1 & 2  
**Blocking**: Session 6

---

### Session 6: Search, Performance & Launch (Week 7-11)

**Ownership**: Frontend/DevOps Lead  
**Estimated Effort**: 35-40 hours  
**Deliverables**:
- Full-text search (Meilisearch) with Arabic support
- Search UI with autocomplete and filters
- Search results page
- Performance optimization (images, code splitting, caching)
- Core Web Vitals optimization (LCP < 3s)
- Google Analytics 4 integration
- Newsletter signup system
- Email notification system
- Monitoring dashboard
- Launch checklist and go-live plan
- Production deployment

**Critical Files**:
- `packages/frontend/src/components/Search/`
- `packages/backend/src/lib/search.ts` (Meilisearch client)
- Performance monitoring setup
- Deployment configuration

**Dependencies**: Sessions 1-5 (all must complete)  
**Blocking**: Public launch

---

## CRITICAL PATH & TIMELINE

```
Week 1-2:    [Session 1: Infrastructure] ——————
             [Session 2: CMS] —————————
Week 3-4:    [Session 3: Frontend] ————————————
Week 5-6:    [Session 4: Homepage] ————
             [Session 5: Admin] ——————————
Week 7-11:   [Session 6: Launch] ————————

Blocking Dependencies:
- Session 1 must complete before any deployment
- Sessions 2 & 3 can overlap after API contracts defined
- Session 4 requires Sessions 2 & 3
- Session 5 requires Sessions 1 & 2
- Session 6 requires all previous sessions
```

### Can Run in Parallel
- Sessions 1 & 2 (infrastructure + CMS) — with early coordination
- Sessions 2 & 3 (CMS + Frontend) — after API contracts
- Sessions 4 & 5 (Public site + Admin) — independent tracks

### Must Be Sequential
- Session 1 → Everything else
- Session 4 → Session 6
- Session 5 → Session 6

---

## IMPLEMENTATION STRATEGY

### Recommended Team Structure (4-6 people)

**Option A: 4-person team**
- **Person 1**: DevOps + Backend (Sessions 1, 2)
- **Person 2**: Frontend (Sessions 3, 4, 6 frontend parts)
- **Person 3**: Full-stack Editorial (Sessions 5, 6 admin parts)
- **Person 4** (part-time): Content/CMS specialist

**Option B: 6-person team**
- **Person 1**: DevOps Engineer (Session 1)
- **Person 2**: Backend/CMS Engineer (Session 2)
- **Person 3**: Frontend Engineer (Session 3)
- **Person 4**: Full-stack Developer (Session 4)
- **Person 5**: Full-stack Developer (Session 5)
- **Person 6**: DevOps/Performance (Session 6)

### Recommended Execution Order

**Week 0 (Planning)**
1. Finalize hosting platform choice (Vercel vs AWS)
2. Register domain
3. Set up team and assign session leads
4. Prepare credentials and access

**Week 1 Kickoff**
1. **Session 1 starts**: DevOps engineer sets up infrastructure
2. **Session 2 starts** (parallel): Backend engineer sets up Strapi
3. **Session 3 starts** (parallel): Frontend engineer scaffolds Next.js

**Week 3 (after Session 1 stabilizes)**
4. **Session 4 starts**: Integrate CMS API, build public pages
5. **Session 5 starts**: Build admin dashboard for editors

**Week 7 (content + frontend mature)**
6. **Session 6 starts**: Add search, optimize performance, launch preparation

---

## SUCCESS CRITERIA

### Session 1 Complete
- ✅ New developer can `npm run setup` and have working local env
- ✅ All GitHub Actions workflows passing
- ✅ Staging environment deployed and accessible
- ✅ Health check shows all systems connected
- ✅ Monitoring working (can see errors in Sentry)

### Session 2 Complete
- ✅ Strapi admin interface accessible
- ✅ Content models created (Article, Category, etc.)
- ✅ 50+ seed articles in database
- ✅ API documented and tested
- ✅ Journalists understand how to use CMS

### Session 3 Complete
- ✅ Next.js dev server runs without errors
- ✅ RTL layout working with Arabic fonts
- ✅ Component library complete with documentation
- ✅ Dark mode toggle working
- ✅ All components responsive on mobile

### Session 4 Complete
- ✅ Homepage displays latest articles
- ✅ Article pages render with correct content
- ✅ SEO tags present and correct
- ✅ Mobile version fully functional
- ✅ Can navigate between pages without errors

### Session 5 Complete
- ✅ Journalists can log in to admin panel
- ✅ Can create/edit/publish articles
- ✅ Can schedule articles for future publishing
- ✅ Admin dashboard shows real analytics
- ✅ Role-based access control working

### Session 6 Complete
- ✅ Search finds articles correctly
- ✅ Site loads in < 3 seconds (Lighthouse score > 90)
- ✅ Analytics data flowing to GA4
- ✅ Newsletter signups working
- ✅ Production deployment successful
- ✅ Team trained on launch procedures

### Pre-Launch Checklist
- ✅ All unit and integration tests passing
- ✅ Security audit completed
- ✅ Accessibility audit (WCAG 2.1 AA)
- ✅ Legal review (terms, privacy policy)
- ✅ DNS configured
- ✅ SSL certificate installed
- ✅ Monitoring and alerting active
- ✅ Backup procedures tested
- ✅ Team trained on operational procedures
- ✅ Marketing materials ready

---

## IMPORTANT: JORDANIAN/ARABIC CONSIDERATIONS

### Text & Localization
- Always use RTL-aware layouts; test with Arabic fonts (Droid Arabic Naskh)
- Proper text direction in comments and user-generated content
- Use Arabic-specific search tokenization (Elasticsearch "arabic" analyzer)
- Implement hreflang tags for Arabic/English versions

### SEO & Discovery
- Register with Google Search Console and Bing in Arabic
- Use NewsArticle schema.org markup
- Create Arabic-language sitemaps
- Optimize for Arabic search terms and keywords

### Performance for Region
- Use CDN with Middle East presence (Cloudflare has Cairo POP)
- Optimize for mobile networks (high traffic on 4G/LTE)
- Minimize image sizes (WebP + fallbacks)
- Test on slow connections (throttle to 4G speeds)

### Editorial & Content
- Design for multiple journalists/editors workflow
- Support content scheduling (publish during peak reading times)
- Version control for articles (revisions, corrections)
- Moderation tools for comments (filter offensive content)

### Legal & Compliance
- GDPR/privacy law compliance (data retention, user privacy)
- Jordanian media regulations (content restrictions if any)
- Cookie consent and tracking compliance
- User data security and encryption

---

## RISK MITIGATION

### High-Risk Items
1. **Hosting/Infrastructure Delays**
   - Mitigation: Decide platform early (Week 0), get access immediately
   - Impact: Blocks all deployment

2. **CMS Content Modeling Errors**
   - Mitigation: Define content model early, test with sample data
   - Impact: Ripples to frontend, requires redesign

3. **RTL Implementation Issues**
   - Mitigation: Test early and often with Arabic content
   - Impact: Delays frontend, affects UX quality

4. **Performance Targets Missed**
   - Mitigation: Set performance budget early, monitor continuously
   - Impact: Poor user experience, bounce rate increases

### Contingency Plans
- **Infrastructure fails**: Have alternate hosting ready (AWS as backup to Vercel)
- **CMS too complex**: Simplify content model for MVP, add features later
- **Performance issues**: Pre-cache common queries, implement CDN more aggressively
- **Launch timeline slips**: Scope-cut features that aren't core MVP

---

## PERFORMANCE TARGETS

**Core Web Vitals (Target for Launch)**
- **LCP** (Largest Contentful Paint): < 3 seconds
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

**Technical Metrics**
- API response time: < 200ms (p95)
- Database query: < 100ms (p95)
- Page load time: < 3 seconds (p95)
- Lighthouse score: > 90 (all categories)

**Operational Metrics**
- Uptime: > 99.5% (max 4 hours downtime/month)
- Error rate: < 0.1%
- Deployment success rate: > 95%

---

## DOCUMENTATION DELIVERABLES

Each session produces:

1. **Technical Documentation**
   - Architecture decisions
   - API reference
   - Database schema
   - Deployment procedures

2. **Operational Documentation**
   - Setup instructions
   - Runbooks for common issues
   - Troubleshooting guides
   - Release procedures

3. **Team Documentation**
   - Contribution guidelines
   - Code review standards
   - Testing requirements
   - Security checklist

4. **User Documentation**
   - Journalist handbook (how to use CMS)
   - Admin guide (how to moderate, manage)
   - Reader FAQ

---

## POST-LAUNCH ROADMAP

**Month 2-3 (After Launch)**
- Subscriptions/paywall implementation
- Personalization engine
- Mobile app (React Native)
- Third-party API access
- Advanced analytics and insights

**Month 4-6**
- Machine learning recommendations
- Multilingual expansion (beyond Arabic/English)
- Video content support
- Live coverage capabilities
- Native app marketing

**Month 6+**
- International expansion
- Partnerships and syndication
- Advertising network optimization
- Reader retention programs

---

## CRITICAL SUCCESS FACTORS

1. **Early Platform Decision**: Choose hosting by Week 0
2. **Clear API Contracts**: Frontend/Backend must align early
3. **Aggressive Testing**: Arabic content must be tested continuously
4. **Performance Focus**: Monitor Core Web Vitals from start, not end
5. **Journalist Input**: Involve journalists in CMS design
6. **Contingency Time**: Budget 15-20% time for issues and delays
7. **Communication**: Daily standup between session leads, weekly full team
8. **Documentation**: Write as you build, not after

---

## FINAL TIMELINE ESTIMATE

**Fastest (with 6-person team, parallel work)**: ~11 weeks  
**Realistic (with contingency, proper testing)**: ~14-16 weeks  
**Conservative (with buffer for issues)**: ~18-20 weeks

**Recommended Target**: 14-16 weeks with quality focus

---

**Document Status**: Complete Architecture Plan  
**Last Updated**: 2026-09-12  
**Next Steps**: Assign Session 1 lead and begin Week 1 kickoff
