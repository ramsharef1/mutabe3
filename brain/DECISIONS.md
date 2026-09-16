# mutabe3 Operational Decisions (2026)

## 2026-09-16

**D-033: Configure App for Production Domain (https://mutabe3.news)**
- **Decided by:** Master Control (MC-AUTH-2026-09-03)
- **What:** Update app configuration to use https://mutabe3.news
  - Frontend .env.production: API URL → https://mutabe3.news:9080
  - Backend CORS: Restricted to mutabe3.news and www.mutabe3.news
  - Built locally, synced to VPS, services restarted
- **Status:** ✅ COMPLETE · 2026-09-16 22:01 UTC

---

## 2026-09-15

**D-032: Remove Login Gate from Website**
- **Decided by:** Rami (explicit authorization: "remove login gate" + "approve")
- **What:** Delete authentication requirements to allow public access
  - ✅ Delete middleware.ts (was blocking redirects)
  - ✅ Delete app/login/page.tsx (login redirect page)
  - ✅ PUSH TO GITHUB (production git action)
  - Trigger Vercel rebuild (auto-deploy)
- **Why:** News website should be public; middleware/login page were causing 307 redirect loop to /login. Removing them allows homepage to serve without authentication.
- **Approval:** User explicitly authorized: "remove login gate", "approve"
- **Status:** ✅ APPROVED FOR DEPLOYMENT · 2026-09-15
