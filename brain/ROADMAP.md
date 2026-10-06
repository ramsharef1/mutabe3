# mutabe3 Features Roadmap

Living list. ⚙️ = a model/UI already partly exists (wiring, not from zero).
Status: ☐ todo · ◐ in progress · ☑ done. Grounded in the live stack as of 2026-10-05.

## Shipped so far
- ☑ Homepage revamp — trending topics, feed sharing, For You, live strip, newsletter editions, community band; tablet/fold/hydration fixes; news-first reorganization into Core News → Services → Community zones with distributed ads (D-036)
- ☑ Auth live — login works, JWT secrets set, DB synced (D-037)
- ☑ Custom CMS — protected `/api/admin/articles` CRUD, `/dashboard` list, create/edit editor, publish/draft/delete, change-password (D-038)
- ☑ Stage 1 — rich-text editor, image upload + media library, real view counts, working search; deployed via CI and smoke-tested in prod (D-039, D-041); hamza search, draft privacy, drain-before-reject fixes (D-042)

## "Finish the site" — stage order (D-043)
Stage 2 real-content foundation (☑ live 2026-10-06) → Stage 3 editorial ops (☑ live 2026-10-06) → Stage 4 readers (☑ live 2026-10-06; inbox delivery needs DNS) → Stage 5 reach & money (☑ live 2026-10-06; ads stay on demo until configured). Each stage is verified locally, deployed by CI, smoke-tested in prod, then logged.

---

## 🛠️ Admin / CMS

### Now — makes the CMS truly usable
- ☑ **Rich-text editor** — headings, bold/italic, lists, quotes, links, YouTube, paste-cleaning, HTML view (D-039, verified in prod D-041)
- ☑ **Image upload + media library** — `POST /api/admin/upload` + `GET /api/admin/media`, featured-image upload; nginx limit 25MB (D-039, D-041); `DELETE /api/admin/media/…` with in-use 409 + a delete control in the library (D-046)
- ☑ **WebP image pipeline** — uploads stored as one WebP master (q82, ≤2048px, EXIF-rotated); resized WebP derivatives at `/api/img/<w>/…` with 640/960 srcset on cards, lead and body images; gif/animated untouched; backfill script + `images_backfill` deploy input (D-045, adopted from okath)
- ☑ **Category management** — 13 nav categories seeded into the DB; `/dashboard/categories` rename/describe/reorder/show-in-nav/add/delete-empty; header, footer, category pages and sitemap read the DB (D-043 Stage 3)
- ☑ **Draft preview** — `/dashboard/preview/[id]` renders the article view from the admin API; dashboard "معاينة" links drafts there (D-043 Stage 2)

### Next — editorial operations
- ☑ **User management** — `/dashboard/users`: admin creates verified accounts, changes roles, sets passwords; VIEWER revokes access (D-043 Stage 3)
- ☑ **Role permissions** — journalists own drafts only, editors publish/schedule/categories/homepage, admin everything; enforced server-side (D-043 Stage 3)
- ☑ **Scheduled publishing** — date/time in the editor; 60-second backend tick publishes due articles (D-043 Stage 3)
- ☑ **Homepage curation** — `/dashboard/homepage`: lead story, ordered editor's picks, breaking bar; instant homepage refresh on save (D-043 Stage 3)
- ☑ **Comments moderation** — `/dashboard/comments`: pending/approved/rejected, approve/reject/delete, pending badge in the nav (D-043 Stage 4)
- ☐ **Analytics** — views per article, top content, trends ⚙️ (`viewsCount` exists)

### Later
- ☐ Live-blog manager (live strip data is hardcoded) ⚙️
- ☑ **Poll manager** — `/dashboard/polls` for the homepage poll and the «وجهان» debate (D-043 Stage 4); breaking bar is in `/dashboard/homepage` (Stage 3)
- ☑ **Newsletter manager** — `/dashboard/newsletter`: stats, compose, test, send, CSV export, automatic morning digest (off by default) (D-043 Stage 4)
- ☑ **Ads manager** — `/dashboard/ads` (admin): four zones, each off / demo / own banners / AdSense unit; publisher id, auto ads, ads.txt (D-043 Stage 5)
- ☐ Ad banner reporting (impressions/clicks per advertiser) and start/end dates for sold banners
- ☐ Revision history · bulk actions · audit log · English edition

---

## 🌐 Website / public

### Now — make it real, not demo
- ☐ **Real content** — replace the 19 dummy articles via the admin (editorial; unblocked once Stage 2 lands)
- ☑ **Article pages that scale** — server-rendered article route fetching by id/slug (not from the latest-20 list), per-article title/description/OG/Twitter meta, real bylines for CMS articles, category pages with their own list (D-043 Stage 2)
- ☑ **SEO plumbing** — `sitemap.xml`, `robots.txt`, `feed.xml`, branded 404 with noindex (D-043 Stage 2)
- ☑ **View tracking** — `POST /api/articles/:id/view`, MostRead/Trending show real counts (D-039, verified D-041)
- ☑ **Working search** — `GET /api/articles?q=` + `/search` page, header forms wired; hamza/ال/ة-ه variants (D-039, D-042)
- ☑ **Related articles** — `relatedByTag` surfaced on article pages ("أخبار ذات صلة" + "اقرأ أيضاً")

### Next — engagement & retention
- ◐ **Newsletter delivery** — both signup forms store subscriptions; sending works from the dashboard via the VPS Postfix. **Blocked on DNS for inbox delivery:** mutabe3.news has no SPF/DKIM/DMARC (D-043 Stage 4)
- ☑ **Reader comments** — post (held for moderation) + approved list on articles; "الأكثر نقاشاً" uses real counts (D-043 Stage 4)
- ☐ **Reader accounts** — save articles / follow topics ⚙️ (SavedArticle model exists)
- ☑ **Server-side polls** — votes persist for everyone, one per browser, IP ceiling (D-043 Stage 4)
- ☐ **Breaking-news notifications** — Follow button is local; real alerts ⚙️

### Later — reach, SEO, money
- ☑ **SEO** — NewsArticle + breadcrumb JSON-LD, publisher/website graph, Google News sitemap, large image previews; sitemap/RSS from Stage 2 (D-043 Stage 5). Per-article generated OG cards skipped (no Arabic shaping in Satori)
- ◐ **Real ads** — zones + AdSense + own banners + ads.txt are live (D-043 Stage 5); **waiting on Rami:** AdSense publisher id or real banners, then switch the demo zones off
- ☐ **Media** — real video hosting, galleries, audio bulletins ⚙️
- ☑ **PWA** — installable app, offline reading of opened pages, `/offline` list (D-043 Stage 5)
- ☐ Native mobile app · multi-language · accessibility pass · mobile layout-viewport overflow (found in Stage 5)

---

## Operational
- ☑ **One-click deploys** — deploy key installed, every push to `main` touching `packages/**` deploys itself; `gh workflow run deploy-vps.yml` on demand (D-039, D-041)
- ☑ `packages/backend/.env` untracked, `.env` ignored, `packages/backend/.env.example` complete (D-040); `mutabe3_user` password rotated (D-042)
- ☑ Both services run as the dedicated `mutabe3` user; nightly dumps + weekly off-site VPS backups (D-048)
- ☐ Add `@types/jsonwebtoken` + `@types/nodemailer` so a strict backend `tsc` run is clean (D-041/D-042 notes) · start the backend from compiled `node dist/` instead of `tsx watch` (D-048 note)
