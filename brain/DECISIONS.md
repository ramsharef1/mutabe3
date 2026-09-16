# mutabe3 Operational Decisions (2026)

## 2026-09-17

**D-034: Homepage, Article and Category Templates Replicate ammonnews.net**
- **Decided by:** Rami ("i want the exact same design, headers, colors, components")
- **What:** Frontend rebuilt as a measured structural replica of ammonnews.net with متابع branding
  - Measurements taken from the live site DOM: 1002px container, #990000 utility bar, #a80101 rules, bold 15px nav, 350×350 hero, 70×55 columnist thumbs, 218×160 cards, 58×58 small thumbs, red-arrow bullet lists, gray gradient box headers, Amiri 20px/35px article body, 84×74 category-list thumbs
  - Shared header/footer/sidebar in `packages/frontend/app/components/site.tsx`, all CSS in `app/globals.css`
  - New routes: `/article/[id]` and `/category/[slug]`; every homepage item links into them
  - Content is dummy for now: 19 seeded articles cycled through all sections, Picsum/Pravatar placeholder photos
  - Backend: `/api/articles*` no longer return `author.password`
- **Why:** Client is evaluating mutabe3 against Ammon specifically; design fidelity first, real content and features next
- **Status:** ✅ LIVE at https://mutabe3.news · 2026-09-17

---

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
