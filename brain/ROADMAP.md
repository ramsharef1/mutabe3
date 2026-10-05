# mutabe3 Features Roadmap

Living list. ⚙️ = a model/UI already partly exists (wiring, not from zero).
Status: ☐ todo · ◐ in progress · ☑ done. Grounded in the live stack as of 2026-10-05.

## Shipped so far
- ☑ Homepage revamp — trending topics, feed sharing, For You, live strip, newsletter editions, community band; tablet/fold/hydration fixes; news-first reorganization into Core News → Services → Community zones with distributed ads (D-036)
- ☑ Auth live — login works, JWT secrets set, DB synced (D-037)
- ☑ Custom CMS — protected `/api/admin/articles` CRUD, `/dashboard` list, create/edit editor, publish/draft/delete, change-password (D-038)

---

## 🛠️ Admin / CMS

### Now — makes the CMS truly usable
- ◐ **Rich-text editor** — built (D-039): headings, bold/italic, lists, quotes, links, YouTube, paste-cleaning, HTML view · awaiting deploy
- ◐ **Image upload + media library** — built (D-039): `POST /api/admin/upload` + `GET /api/admin/media`, featured-image upload · awaiting deploy
- ☐ **Category management** — create/edit/reorder (currently read-only) ⚙️
- ☐ **Draft preview** — see a draft as it will publish

### Next — editorial operations
- ☐ **User management** — admin creates editors/journalists, assigns roles ⚙️ (ADMIN/EDITOR/JOURNALIST/VIEWER already in schema)
- ☐ **Role permissions** — journalists edit own drafts, editors publish, admin everything
- ☐ **Scheduled publishing** — SCHEDULED status exists; cron auto-publishes at `scheduledPublishAt` ⚙️
- ☐ **Homepage curation** — pick hero / featured / editor's picks / breaking manually ⚙️
- ☐ **Comments moderation** — approve/delete reader comments ⚙️ (Comment model exists)
- ☐ **Analytics** — views per article, top content, trends ⚙️ (`viewsCount` exists)

### Later
- ☐ Live-blog manager (live strip data is hardcoded) ⚙️
- ☐ Poll + breaking-ticker manager ⚙️
- ☐ Newsletter manager — subscribers + campaigns ⚙️ (Subscription model exists)
- ☐ Revision history · bulk actions · audit log · English edition

---

## 🌐 Website / public

### Now — make it real, not demo
- ☐ **Real content** — replace the 19 dummy articles via the admin (editorial)
- ◐ **View tracking** — built (D-039): `POST /api/articles/:id/view`, MostRead/Trending show real counts · awaiting deploy
- ◐ **Working search** — built (D-039): `GET /api/articles?q=` + `/search` page, header forms wired · awaiting deploy
- ☐ **Related articles** — `relatedByTag` exists; surface on article pages ⚙️

### Next — engagement & retention
- ☐ **Newsletter delivery** — signup UI + nodemailer exist; wire sending ⚙️
- ☐ **Reader comments** — post/display on articles ⚙️
- ☐ **Reader accounts** — save articles / follow topics ⚙️ (SavedArticle model exists)
- ☐ **Server-side polls** — votes persist for everyone (local-only now) ⚙️
- ☐ **Breaking-news notifications** — Follow button is local; real alerts ⚙️

### Later — reach, SEO, money
- ☐ **SEO** — Article schema.org, sitemap, RSS, per-article OG images
- ☐ **Real ads** — AdSense/ad-server instead of placeholder banners (monetization goal) ⚙️
- ☐ **Media** — real video hosting, galleries, audio bulletins ⚙️
- ☐ PWA / mobile app · multi-language · accessibility pass

---

## Operational
- ☐ **One-click deploys** — add the 4 `VPS_*` secrets so GitHub Actions deploys (operator IP 92.241.37.76 is banned at Hostinger's network edge; deploys currently via hPanel Browser terminal — see D-038)
- ☐ Reconcile `packages/backend/.env` (stale DB password; backend reads `/etc/mutabe3/backend.env`)
