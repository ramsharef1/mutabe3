# Mutabe3 Work Sessions Overview

Master tracking document for all 6 work sessions. This is the command center for project coordination.

---

## Session Status Matrix

| Session | Name | Timeline | Lead | Status | Blockers | Next Action |
|---------|------|----------|------|--------|----------|-------------|
| **1** | Infrastructure & DevOps | Week 1-2 | [To Assign] | 🟠 Not Started | Hosting platform decision | [Assign + Start] |
| **2** | CMS Implementation | Week 1-3 | [To Assign] | 🟠 Not Started | Blocked by Session 1 | [Assign + Wait] |
| **3** | Frontend Foundation | Week 2-5 | [To Assign] | 🟠 Not Started | Blocked by Session 1 (API contracts) | [Assign + Wait] |
| **4** | Homepage & Articles | Week 4-6 | [To Assign] | 🟠 Not Started | Blocked by Sessions 2 & 3 | [Assign + Wait] |
| **5** | Admin Dashboard | Week 5-8 | [To Assign] | 🟠 Not Started | Blocked by Sessions 1 & 2 | [Assign + Wait] |
| **6** | Search & Launch | Week 7-11 | [To Assign] | 🟠 Not Started | Blocked by Sessions 1-5 | [Assign + Wait] |

**Status Legend**: 🟠 Not Started | 🟡 In Progress | 🟢 Completed

---

## Session 1: Infrastructure & DevOps

**📋 Quick Info**
- **Timeline**: Week 1-2 (2 weeks)
- **Owner**: DevOps/Backend Engineer
- **Team Size**: 1-2 people
- **Status**: 🟠 Not Started
- **Estimated Effort**: 30-35 hours

**🎯 Deliverables**
- Docker setup with full dev stack
- Database schema (Prisma)
- CI/CD pipeline (GitHub Actions)
- Staging environment deployed
- Monitoring (Sentry) configured
- Health checks and logging

**📦 Dependencies**
- ✅ No blocking dependencies (can start immediately)
- ⏳ Hosting platform must be selected first (Vercel vs AWS)

**👥 Hands-Off Requirements**
- [ ] Hosting platform and credentials
- [ ] Domain name (if ready)
- [ ] Secrets manager access
- [ ] GitHub Actions permissions

**📚 Documentation**
- See: `.claude/sessions/01-infrastructure/`
  - `session-notes.md` — Full context and technical details
  - `TASKS.md` — Detailed task checklist for the week

**🔗 Links to Next Sessions**
- Session 2 can start when: Database basics ready + API contracts defined
- Session 3 can start when: Database basics ready + Deployment pipeline working
- Sessions 4-6: All depend on Session 1 completion

---

## Session 2: CMS Implementation

**📋 Quick Info**
- **Timeline**: Week 1-3 (3 weeks)
- **Owner**: Backend/CMS Engineer
- **Team Size**: 1-2 people
- **Status**: 🟠 Not Started
- **Estimated Effort**: 25-30 hours

**🎯 Deliverables**
- Strapi CMS fully configured
- Content models (Article, Author, Category, etc.)
- User roles and permissions setup
- Publishing workflow (draft → review → publish)
- Scheduled publishing infrastructure
- REST/GraphQL APIs for frontend
- Seed content (50+ articles) for testing

**📦 Dependencies**
- ⏸️ Blocked by: Session 1 (database, hosting)
- ⚠️ Parallel work: Can start when database schema from Session 1 is ~50% done
- ⏳ Needs API contracts from Session 3 (frontend)

**👥 Hands-Off Requirements**
- [ ] Database connection string from Session 1
- [ ] CMS platform/tool confirmed (Strapi recommended)
- [ ] Editorial guidelines documented
- [ ] Content taxonomy/categories defined

**📚 Documentation**
- See: `.claude/sessions/02-cms/`
  - `session-notes.md` — CMS architecture and content modeling
  - `TASKS.md` — CMS implementation checklist

**🔗 Next Steps**
- Session 3 needs: CMS API documentation + content models finalized
- Session 4 needs: CMS API deployed + sample content ready

---

## Session 3: Frontend Foundation & Design System

**📋 Quick Info**
- **Timeline**: Week 2-5 (4 weeks, but can start overlap)
- **Owner**: Frontend/Design Engineer
- **Team Size**: 1-2 people
- **Status**: 🟠 Not Started
- **Estimated Effort**: 30-40 hours

**🎯 Deliverables**
- Next.js project setup with i18n (Arabic/English)
- RTL support configured (TailwindCSS + twrtl)
- Component library (30-50 components)
- Design system tokens (colors, typography, spacing)
- Layout templates (homepage, article, category, error pages)
- Dark mode support
- Responsive design (mobile-first)
- Storybook or similar component documentation

**📦 Dependencies**
- ⏸️ Blocked by: Session 1 (deployment pipeline)
- ⚠️ Needs: API contracts from Session 2 (CMS)
- ⚠️ Parallel: Can work on components while Session 2 defines API

**👥 Hands-Off Requirements**
- [ ] Design mockups or brand guidelines
- [ ] Color palette and typography specs
- [ ] Component specifications
- [ ] Deployment pipeline from Session 1

**📚 Documentation**
- See: `.claude/sessions/03-frontend/`
  - `session-notes.md` — Frontend architecture and i18n setup
  - `TASKS.md` — Component and design system checklist

**🔗 Next Steps**
- Session 4 needs: All components + layouts ready
- Session 5 needs: Admin layout components ready

---

## Session 4: Homepage & Article Display

**📋 Quick Info**
- **Timeline**: Week 4-6 (3 weeks)
- **Owner**: Full-stack Developer
- **Team Size**: 1-2 people
- **Status**: 🟠 Not Started
- **Estimated Effort**: 25-30 hours

**🎯 Deliverables**
- Homepage with latest articles feed
- Article detail pages with rich text rendering
- Category/topic filtering pages
- Author pages
- Breadcrumb navigation
- Related articles widget
- SEO optimization (meta tags, OpenGraph, schema.org)
- Social sharing buttons
- Comments section (optional: Disqus or custom)

**📦 Dependencies**
- ⏸️ Blocked by: Sessions 2 & 3 (CMS API + components)
- ⚠️ Can start: When CMS API docs ready + frontend components done

**👥 Hands-Off Requirements**
- [ ] CMS API deployed and documented
- [ ] Frontend components from Session 3
- [ ] 50+ seed articles in CMS (from Session 2)
- [ ] SEO strategy/guidelines

**📚 Documentation**
- See: `.claude/sessions/04-content/`
  - `session-notes.md` — Page architecture and SEO strategy
  - `TASKS.md` — Page implementation checklist

**🔗 Next Steps**
- Session 6 needs: All public pages complete

---

## Session 5: Admin Dashboard & Editorial Workflows

**📋 Quick Info**
- **Timeline**: Week 5-8 (4 weeks)
- **Owner**: Full-stack Developer
- **Team Size**: 1-2 people
- **Status**: 🟠 Not Started
- **Estimated Effort**: 30-40 hours

**🎯 Deliverables**
- Admin authentication & role-based access control
- Article management (create, edit, publish, schedule)
- Category management interface
- Author/contributor management
- Analytics dashboard (views, trending, engagement)
- Editorial calendar
- Content moderation tools
- User subscription management
- Admin design system and layouts

**📦 Dependencies**
- ⏸️ Blocked by: Sessions 1 & 2 (infrastructure + CMS)
- ⚠️ Parallel: Can start when CMS API ready

**👥 Hands-Off Requirements**
- [ ] Editorial workflows defined
- [ ] User roles and permissions specs
- [ ] Admin feature requirements
- [ ] Analytics data available

**📚 Documentation**
- See: `.claude/sessions/05-admin/`
  - `session-notes.md` — Admin architecture and workflows
  - `TASKS.md` — Admin implementation checklist

**🔗 Next Steps**
- Session 6 needs: Admin dashboard complete for analytics integration

---

## Session 6: Search, Performance & Launch

**📋 Quick Info**
- **Timeline**: Week 7-11 (5 weeks, last session)
- **Owner**: Frontend/DevOps Engineer
- **Team Size**: 1-2 people
- **Status**: 🟠 Not Started
- **Estimated Effort**: 35-40 hours

**🎯 Deliverables**
- Full-text search (Meilisearch) with Arabic support
- Search UI with autocomplete
- Search results page with filtering
- Performance optimization (image lazy-loading, code splitting, caching)
- Core Web Vitals optimization
- Newsletter signup & email integration
- Analytics integration (Google Analytics 4)
- Monitoring dashboard
- Launch checklist and go-live plan

**📦 Dependencies**
- ⏸️ Blocked by: Sessions 1-5 (all must be complete)
- ⏳ Final session: integrates all previous work

**👥 Hands-Off Requirements**
- [ ] All public pages from Session 4
- [ ] All admin tools from Session 5
- [ ] Performance budget defined
- [ ] Launch timeline and checklist
- [ ] Marketing/PR strategy

**📚 Documentation**
- See: `.claude/sessions/06-launch/`
  - `session-notes.md` — Launch strategy and optimization
  - `TASKS.md` — Launch preparation checklist

**🔗 Launch Requirements**
- All blockers cleared
- Performance targets met
- Marketing materials ready
- Legal/privacy compliance verified

---

## Dependency Graph

```
Timeline (Weeks):
Week 1-2:    [Session 1: Infrastructure] ——————
             [Session 2: CMS] —————————
Week 3-4:    [Session 3: Frontend] ————————————
Week 5-6:    [Session 4: Homepage/Articles] ————
             [Session 5: Admin Dashboard] ——————————
Week 7-11:   [Session 6: Search/Performance/Launch] ————————

Dependencies:
             ┌─────────────────────────────────┐
             │   Session 1: Infrastructure     │  (foundation — blocks everything)
             └──────────┬──────────────────────┘
                        │
           ┌────────────┴────────────┐
           ▼                         ▼
      [Session 2: CMS]         [Session 3: Frontend]
           │                         │
           │      ┌──────────────────┘
           │      │
           ▼      ▼
      [Session 4: Content Pages]
           │
           ├─────────────────┐
           │                 │
           ▼                 ▼
      [Session 5: Admin]  [Session 6: Launch]
                              ▲
                              │
                    (Integrates all above)
```

---

## Critical Path

The minimum path to launch:

1. **Session 1** must complete before anything can deploy
2. **Sessions 2 & 3** can overlap but need early coordination
3. **Session 4** needs both 2 & 3 complete
4. **Session 5** needs 1 & 2 complete (parallel to 4)
5. **Session 6** integrates everything and requires 1-5 complete

**Fastest timeline**: ~11 weeks (Sessions run with maximum overlap)  
**Realistic timeline**: ~14-16 weeks (with contingency and coordination time)

---

## Current Project Status

**Master Timeline**: Started 2026-09-12  
**Current Phase**: Architecture & Planning  
**Next Phase**: Infrastructure setup (Session 1)

**Key Decisions Made**:
- ✅ Tech stack selected (Next.js, Node, PostgreSQL, Strapi)
- ✅ 6 sessions identified and documented
- ✅ Dependencies mapped

**Key Decisions Pending**:
- ⏳ Hosting platform (Vercel vs AWS vs other)
- ⏳ Domain registration
- ⏳ Secrets manager setup
- ⏳ Team member assignments
- ⏳ Start date for Session 1

---

## How to Use This Document

### For Project Leads
- Check status matrix for overall progress
- Identify blocking dependencies
- Coordinate between sessions
- Escalate blockers

### For Session Leads
1. Find your session above
2. Read the quick info and deliverables
3. Check dependencies and blockers
4. Go to `.claude/sessions/XX-name/` for detailed docs
5. Follow `TASKS.md` checklist for the week

### For Team Members
1. Identify which session you're assigned to
2. Read the overview above
3. Go to session folder: `.claude/sessions/XX-name/`
4. Start with `session-notes.md` for context
5. Follow `TASKS.md` day-by-day

---

## Session Handoff Checklist

When a session is complete, verify:

- [ ] All deliverables from `TASKS.md` are done
- [ ] Documentation is complete and reviewed
- [ ] Code is merged to `main` branch
- [ ] Staging environment reflects changes
- [ ] Next session can proceed without blockers
- [ ] Team has signed off on quality

---

## FAQ & Common Questions

**Q: Can I start my session before the blocking session is done?**  
A: Partially. You can prepare, set up scaffolding, and plan. But wait for actual integration until dependencies are ready.

**Q: What if my session is taking longer than estimated?**  
A: Flag it immediately. We may need to add resources, adjust timeline, or descope features.

**Q: Who do I contact if I hit a blocker?**  
A: Escalate to your session lead, then to the project lead. Include impact assessment.

**Q: Can sessions run in different order?**  
A: No. Session 1 must complete first (infrastructure foundation). After that, 2/3 can swap order, but 4+ have hard dependencies.

---

**Last Updated**: 2026-09-12  
**Maintained By**: Project Lead  
**Next Review**: When Session 1 starts

---

## Quick Links

- 📘 [Project README](../README.md)
- 📚 [Architecture Plan](../docs/IMPLEMENTATION_PLAN.md)
- 💾 [Database Schema](../docs/DATABASE_SCHEMA.md)
- 📝 [Prompts Library](../docs/PROMPTS_LIBRARY.md)
- 🔧 [Session 1 Details](./01-infrastructure/session-notes.md)
- 🔧 [Session 2 Details](./02-cms/session-notes.md) (coming soon)
- 🔧 [Session 3 Details](./03-frontend/session-notes.md) (coming soon)
- 🔧 [Session 4 Details](./04-content/session-notes.md) (coming soon)
- 🔧 [Session 5 Details](./05-admin/session-notes.md) (coming soon)
- 🔧 [Session 6 Details](./06-launch/session-notes.md) (coming soon)
