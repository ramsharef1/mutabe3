# mutabe3 · DISPATCH

**Task dispatch from FORGE to project.** Sections: ## Open (active work), ## Done (closed tasks).

---

## Open

*(RELAY-WEBP moved to Done — 2026-10-06)*




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

### RELAY-WEBP · from FORGE · 2026-10-06 · ✅ live in prod 7e7e727, smoke-tested, backfill dry-run clean (D-045)
**From:** FORGE (relayed from Okath Master Control) · **To:** mutabe3 Code session · **Priority:** 🟠 High
**Result:** sharp 0.35 installed; Layer 1 (WebP masters on upload, gif/animated passthrough, never-lose fallback) + Layer 2 (`/api/img/<w>/…` derivatives 160–1280, 640/960 srcset on cards/lead/body) + backfill script with dry-run/apply/--delete-original and a CI `images_backfill` switch. Local proof: 4000px JPEG 2.07 MB → 0.12 MB master; legacy masters 2.86 MB → 0.13 MB; sample article images 3.33 MB → 0.17 MB. Prod media had 0 jpg/png masters (nothing to backfill). Full record: brain/DECISIONS.md D-045.

**Task (Rami, verbatim):** Adopt okath's WebP image pipeline, adapted to THIS repo's Node/TypeScript stack (not Laravel — do NOT copy the PHP verbatim). Reference: WEBP-IMAGES-HANDOFF.md now in the repo root (okath's exact approach + backfill flow). Implement the same two layers: (1) CONVERT ON UPLOAD — in packages/backend, transcode every uploaded image to a single WebP master (use `sharp`: quality ~82, auto-rotate from EXIF, cap width ~2048, flatten alpha onto white), store only the WebP, with a safe fallback so an upload is never lost; wire it into the image-upload handler(s). (2) SERVE RESIZED WEBP — generate/caches derivatives at a width whitelist (160/320/480/640/960/1280) via sharp, served on demand (route/CDN/loader) or at build time; render images with a 640/960 srcset; pass SVG/GIF through untouched (keep animation). For EXISTING images: write a one-off backfill script (dry-run first) that re-encodes stored JPEG/PNG masters to WebP and repoints the DB/record paths, with an opt-in delete-original to reclaim disk; also handle any <img src> inside stored HTML/content fields. Confirm the image lib is present first (sharp installed). Keep advertiser/animated creatives in original format. Report media-size and a sample page weight before/after. This is image-infra only — do not touch the in-flight packages/backend/.env untracking task.

**Here this means (mutabe3 = Next.js + Strapi + Postgres, VPS Docker):** Layer 1 lands in the Strapi backend — process uploads with sharp (Strapi upload provider / lifecycle) so the stored master is WebP (q82, EXIF auto-rotate, max width 2048, alpha flattened), keeping a fallback. Layer 2 = WebP responsive sizes (160–1280) served to the Next.js frontend with a 640/960 `srcset` (via the Next image loader, a sharp-backed route, or Strapi responsive formats emitting WebP). Backfill = a one-off script over existing Strapi media in Postgres (+ `<img src>` inside rich-text/body fields), dry-run first, `--delete-original` opt-in. The full reference code + backfill command pattern is in `WEBP-IMAGES-HANDOFF.md` at the repo root.

**Done means:** new uploads are WebP masters; article/list pages serve WebP derivatives with srcset; existing media + inline body images backfilled (dry-run then applied); SVG/GIF and animated creatives untouched; before/after media-folder size and a sample page weight reported.

**Gates:** image-infra ONLY — do **not** touch the in-flight `packages/backend/.env` untracking task; confirm `sharp` is installed before coding; no destructive delete of originals without the explicit `--delete-original` run.

**Report to:** `~/Projects/forge/INBOX.md` — `mutabe3 · RELAY-WEBP · <result> · before/after sizes`.


---

**Last updated:** 2026-09-12  
**Next review:** After Rami approves structure
