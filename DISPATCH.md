# mutabe3 · DISPATCH

**Task dispatch from FORGE to project.** Sections: ## Open (active work), ## Done (closed tasks).

---

## Open

### Task: Complete Forge Structure Setup
**From:** FORGE  
**To:** mutabe3 Code session  
**Date:** 2026-09-12  
**Priority:** 🔴 Critical  
**Estimate:** 2-3 hours

**What to do:**
1. Create `COMMANDS.md` (tech procedures for tier:forge)
2. Create `connectors/` folder with templates:
   - `connectors/production.md` (Vercel prod config)
   - `connectors/staging.md` (Vercel staging config)
   - `connectors/GITHUB.md` (GitHub CI/CD)
   - `connectors/SENTRY.md` (error tracking)
   - `connectors/STRAPI.md` (CMS setup)
3. Create `tech/COMMANDS.md` (tech-specific procedures)
4. Create `tech/DECISIONS.md` (tech decisions log)
5. Commit: `forge: mutabe3 structure complete`
6. Get Rami approval on structure

**Success criteria:**
- ✅ All 6 forge documents present and populated
- ✅ Connectors folder with 5 connector templates
- ✅ Tech folder with procedures and decisions
- ✅ Git committed
- ✅ Rami approves structure

**Blockers:** None (documentation ready to convert)

---

### Task: Prepare Session 1 Environment Setup
**From:** FORGE  
**To:** mutabe3 Code session  
**Date:** 2026-09-12  
**Priority:** 🟠 High  
**Estimate:** 1-2 hours

**What to do:**
1. Create checklist of what Rami needs to set up BEFORE Session 1 starts:
   - Vercel account created + API token saved
   - Sentry account created + DSN saved
   - GitHub Actions secrets configured (VERCEL_TOKEN, SENTRY_DSN)
   - Local Docker Desktop installed + tested
   - Node.js 18+ installed
2. Write `.env.example` with all variables needed
3. Create `docs/SETUP-INSTRUCTIONS.md` for first-time dev setup
4. Commit: `docs: Session 1 setup instructions`

**Success criteria:**
- ✅ Checklist complete
- ✅ `.env.example` fully populated
- ✅ Setup instructions clear and tested (can someone follow them?)
- ✅ Git committed

**Blockers:** None (clear path forward)

---

### Task: Confirm Session 1 Start Date with Rami
**From:** FORGE  
**To:** mutabe3 Code session  
**Date:** 2026-09-12  
**Priority:** 🟠 High  
**Estimate:** Async (Rami response needed)

**What to do:**
1. Present Rami with:
   - Forge structure (for approval)
   - Decisions D-7, D-10 (for sign-off)
   - Session 1 checklist (what needs to be done before Monday)
   - Team assignment need (who leads Sessions 2-6?)
2. Wait for Rami approval + decisions
3. Confirm Session 1 start date (this week or next?)

**Success criteria:**
- ✅ Rami approves forge structure
- ✅ Rami signs off on D-7, D-10
- ✅ Rami confirms Session 1 start date
- ✅ Session 1 lead (Rami) has environment setup checklist

**Blockers:** Awaiting Rami response

---

## Done

*(None yet — project just started)*

---

**Last updated:** 2026-09-12  
**Next review:** After Rami approves structure
