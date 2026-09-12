# mutabe3 · PLAN

**Bible for this project.** Decisions in force, verified state, priorities, open questions for Rami, resume point.

---

## Decisions in Force

### D-1: Tech Stack Selection (LOCKED)
**Status:** ✅ Decided 2026-09-12  
**Decision:** 
- Frontend: Next.js 14+ (App Router)
- Backend: Node.js API
- Database: Vercel Postgres
- CMS: Strapi (self-hosted)
- Hosting: Vercel
- Search: Meilisearch (Arabic support)

**Rationale:** Fast to launch, leverages Vercel's Next.js optimization, managed Postgres reduces DevOps burden, Strapi gives full control over editorial workflows.

**Gate:** None (fully decided)

---

### D-2: 6 Parallel Sessions (LOCKED)
**Status:** ✅ Decided 2026-09-12  
**Decision:** Break project into 6 sessions with clear dependencies:
1. Infrastructure & DevOps (Week 1-2)
2. CMS Implementation (Week 1-3)
3. Frontend Foundation (Week 2-5)
4. Homepage & Articles (Week 4-6)
5. Admin Dashboard (Week 5-8)
6. Search & Launch (Week 7-11)

**Rationale:** Parallel work reduces total timeline, dependencies are explicit, each session is independently scoped.

**Gate:** None (validated by Plan agent)

---

### D-3: Forge Project Structure (IN PROGRESS)
**Status:** 🔨 Implementing 2026-09-12  
**Decision:** Use forge governance model:
- mutabe3.md (front door)
- FACTS.md (canonical state)
- PLAN.md (this file)
- WORKLOG.md (session log)
- DECISIONS.md (decision log)
- DISPATCH.md (task dispatch)
- COMMANDS.md (tier forge, tech procedures)
- connectors/ (Vercel, GitHub, Sentry, Strapi)
- tech/ (tech-specific decisions)

**Rationale:** Ensures consistency with other forge projects, established patterns, centralized state tracking.

**Gate:** Rami (verify structure matches forge standards before proceeding)

---

## Verified State (as of 2026-09-12)

✅ **Architecture phase complete**
- Implementation plan drafted (11-week roadmap)
- 6 sessions defined with dependencies
- Tech stack locked

✅ **Prompts library created**
- 21 prompts for journalists, editors, content teams
- Ready for newsroom use

✅ **Git repository** 
- Initial commit with all documentation
- Main branch clean

⏳ **Forge structure**
- Front door (mutabe3.md) created
- FACTS.md created
- PLAN.md (this file) created
- TBD: WORKLOG.md, DECISIONS.md, DISPATCH.md, COMMANDS.md

⏳ **Credentials & Access**
- Vercel account needs configuration (TBD)
- Sentry account needs setup (TBD)
- GitHub Actions secrets need population (TBD)

---

## Priorities

### Critical Path (unblock everything else)
1. **Session 1 kickoff:** Infrastructure setup (Vercel, Postgres, CI/CD, monitoring)
   - Blocks Sessions 2-6
   - Owner: Rami
   - Start: This week

### High Priority (enable parallel work)
2. **Session 2 & 3 parallel start:** CMS models + Frontend scaffolding
   - Both can run once Session 1 lays groundwork
   - Need early API contract alignment

3. **Complete forge structure:** WORKLOG.md, DECISIONS.md, DISPATCH.md, COMMANDS.md
   - Enables proper project tracking
   - Gate: Rami approval of structure

### Medium Priority (polish)
4. **Session 4-6 detailed planning:** Flesh out exact deliverables once 1-3 make progress
5. **Team assignments:** Recruit or assign leads for Sessions 2-6

---

## Open Questions for Rami

- [ ] **Team:** Who leads Sessions 2-6? Contractor, internal, hybrid?
- [ ] **Timeline pressure:** Is 11-week MVP tight? Can we absorb delays?
- [ ] **Scope:** Are all 6 sessions essential for launch, or can some be post-launch?
- [ ] **Budget:** Approve monthly infrastructure spend (~$200-300/mo estimated)?
- [ ] **Forge structure:** Is this the right pattern, or do you prefer different files/layout?
- [ ] **Domain:** Should we plan for .jo/.com domain migration path?

---

## Resume Point (where to pick up next session)

**Current state (end of 2026-09-12 turn):**
- ✅ All architecture documentation created
- ✅ Moved mutabe3 to forge project structure
- ✅ mutabe3.md, FACTS.md, PLAN.md created
- 🔨 Next: Create WORKLOG.md, DECISIONS.md, DISPATCH.md, connectors/
- 🔨 Then: Rami confirms forge structure OK
- 🔨 Then: Start Session 1 infrastructure setup

**Immediate next steps:**
1. Create remaining forge documents (WORKLOG, DECISIONS, DISPATCH)
2. Set up connectors/ folder (Vercel, GitHub, Sentry, Strapi templates)
3. Get Rami approval to proceed with Session 1
4. Assign Session 1 start date (recommended: this week)

---

## Notes

- See `FACTS.md` for current state (URLs, credentials, paths, team)
- See `DISPATCH.md` for open tasks from FORGE
- See `DECISIONS.md` for full decision log
- See `docs/IMPLEMENTATION_PLAN.md` for detailed 11-week roadmap
- See `.claude/SESSIONS_OVERVIEW.md` for session tracking and dependencies

---

**Last updated:** 2026-09-12 by Claude  
**Locked by:** Rami (pending)  
**Next:** WORKLOG.md, DECISIONS.md, DISPATCH.md to be created
