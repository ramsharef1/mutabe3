# TECH-STACK — mutabe3
Status: confirmed 2026-10-06 (D-050). Keep the stack; fix the two end-of-life runtimes; add nothing that needs running.

## Stack (verified)
Next 14.2 App Router (standalone, PWA, RTL) · Express 4 + Prisma 5 + Postgres 13 (AlmaLinux AppStream build — verify origin with `rpm -qi postgresql-server`) · sharp WebP pipeline · systemd + nginx on a shared Hostinger VPS (AlmaLinux 9.8, SELinux disabled) · GitHub Actions deploy (`deploy-vps.yml`) + ops workflow (`ops-vps.yml`, scripts in `ops/vps/`).

| Concern | Decision | Revisit when |
|---|---|---|
| Runtime | **Node 22 LTS now** (prod Node v20.20.2 reached EOL 2026-04-30 — [endoflife.date](https://endoflife.date/nodejs)); per-instance node binary referenced from the unit's `ExecStart`, never swap the shared global node | Node 24 with Next 16 |
| Framework | Next 14 is unsupported ([support policy](https://nextjs.org/support-policy)); **Next 16 upgrade deferred past 90 days** (owner: scope). Upgrade cost measured: 6 files use `params`/`searchParams`, 0 `next/headers`, 44 client components, ~6.6k lines | after the first sale, before the re-theme is extended |
| Database | Postgres 13 EOL upstream 2025-11-13, but RHEL 9 patches its build until 2032 ([Red Hat](https://access.redhat.com/articles/6654721)); Prisma 5 supports 9.6–18 | if the package origin is not AppStream |
| Search | keep `termVariants` + **pg_trgm GIN** on title/summary (weeks 9–12); current ILIKE over up to 6 terms × variants × 3 columns has no index | search p95 > 300 ms → Meilisearch ([Arabic normalisation](https://github.com/wyilio/charabia)) |
| Jobs | in-process scheduler; **add `NewsletterDelivery` log + boot reaper** for issues stuck in `sending` (`newsletter.ts:57` only claims `draft|failed`) | push/stat fan-out → pg-boss (needs Node ≥22.12) |
| Cache | Next ISR/tags + immutable `/api/img`; no Redis (single process; `redis` package unused) | >1 API process |
| Schema | baseline `prisma migrate` (0_init, `migrate resolve --applied`) and `migrate deploy` instead of `db push` | before instance #2 |
| Deps | **commit `package-lock.json`, `npm ci`**, Dependabot weekly grouped + security; drop unused `redis` (backend) and `next-intl` (frontend); `.nvmrc` | — |

## Brand contract (deferred with packaging; shape agreed)
`brands/<slug>/brand.ts` (public, no secrets), selected by `BRAND` at build: siteName, shortName, legalName, licenceNo, editorInChief, domain, locales, dir, logo paths, tokens (ink, paper, paper2, accent, muted, breaking, fontHead, fontBody), defaultCategories, adZones (header 728×90, inline, article, sidebar 300×250, mobile 320×100), social, mailFrom, gaId. Today "mutabe3.news"/"المتابع" is hardcoded in 35 files and `globals.css` holds 382 hex literals — the re-theme (weeks 5–8) moves them to `:root` tokens, which is step one of the brand file.

## Env contract (today → new)
| Group | Today | New |
|---|---|---|
| Core | DATABASE_URL, PORT, NODE_ENV | BRAND, INSTANCE (deferred) |
| URLs | FRONTEND_URL, SITE_URL (backend) | SITE_URL (frontend), CORS_ORIGINS (replace the hardcoded list) |
| Crypto | JWT_SECRET (also seals SMTP password + salts IP hashes), JWT_REFRESH_SECRET | REVALIDATE_SECRET; HKDF sub-keys (SECURITY S-05) |
| Media | UPLOAD_DIR | — |
| Mail | SMTP_HOST/PORT/USER/PASSWORD/FROM/SECURE, MAIL_DRY_RUN | ALERT_EMAIL (owner decision 4.2) |
| Frontend | VPS_API, NEXT_PUBLIC_API_URL | — |
| Optional (deferred) | — | ANTHROPIC_API_KEY, AI_MONTHLY_BUDGET_USD, VAPID_*, SENTRY_DSN |

## Ads data model (weeks 3–4, additive — no portal, no payment fields)
- `Advertiser{id,name,contactEmail,phone?,notes?,campaigns,createdAt}`
- `Campaign{id,advertiserId,name,zones String[],startAt,endAt,status REQUESTED|APPROVED|ACTIVE|PAUSED|ENDED|REJECTED,weight Int@1,notes?,createdAt,updatedAt; @@index([status,startAt,endAt])}` — activation/deactivation by admin; **no paidAt/amount** (owner decision 4.3)
- `Creative{id,campaignId,zone,imageUrl,mobileImageUrl?,w,h,mw?,mh?,clickUrl,alt,status PENDING|APPROVED|REJECTED}`
- `DailyStat{creativeId,zone,day @db.Date,impressions,clicks; @@unique([creativeId,zone,day])}`
Serving: `ads.ts readAds` merges ACTIVE campaigns (now ∈ [startAt,endAt), zone match, approved creative) into zones as weighted banners; Next keeps the 60 s `ads` tag; `scheduler.ts` flips APPROVED→ACTIVE→ENDED; fixed-size slots per zone (upload rejects off-size); impression = ≥50% visible ≥1 s via IntersectionObserver, one per creative per pageview, `sendBeacon('/api/ads/ev')`, drop bots/hidden tabs/staff, aggregate in memory, upsert `DailyStat` each tick; click = `GET /api/ads/c/:creativeId` → 302 to the DB `clickUrl`; creatives via `storeUpload` into `UPLOAD_DIR/ads/YYYY/MM` (extend `REL_RE`; `listMedia` skips `ads`), rendered through `/api/img`. Files: `schema.prisma`, `ads.ts`, `uploads.ts`, `scheduler.ts`, `routes/admin.ts`, `index.ts`, `components/ads.tsx`, `adsConfig.ts`, `lib/ads.ts`, `dashboard/ads`, `public/sw.js` (skip `/api/ads/(c|ev)`). Today `components/ads.tsx` links straight to the advertiser and uses the full master image, not `/api/img`.

## Deploy risk register (open)
EOL Node/Next · no lockfile (`npm install` on `^` ranges each deploy) · in-place `next build` over the live `.next` · failed health check doesn't roll back · `db push` instead of migrations · root SSH deploy · sed on the shared nginx file · VPS restore hits all sites · shared global node · newsletter stuck on restart. Release-directory deploys with symlink swap + auto-revert: **deferred with packaging** unless a failed deploy bites first.

**Update 2026-10-08 (D-084):** Next 16.4 + React 19.3, Prisma 7.10 with @prisma/adapter-pg (client generated into packages/backend/src/generated/prisma, config in packages/backend/prisma.config.ts), ESLint 9 flat config, Node ≥20.19 (production Node 22). The "Next 16 deferred 90+ days" item is done.
