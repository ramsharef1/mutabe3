# ANALYTICS-PLAN — mutabe3
Status: approved with plan v2 (D-050). Two layers: **GA4 + GTM, consent-gated, proves audience**; **first-party daily rollups carry the money numbers** (`ArticleViewDaily`, `AdStatDaily`), independent of consent and ad blockers. No server-side tagging, no Meta pixel at launch. Alerts by **email** (owner decision 4.2). Advertiser portal stats deferred with the portal.

## 1. KPI tree
| Goal | KPIs | Source |
|---|---|---|
| Audience | sessions, users, returning %, pages/session, `read_complete` rate; views per article (24h/7d/30d); Discover/search share; net newsletter subscribers | GA4 · `ArticleViewDaily` · Search Console Discover report · DB |
| Revenue | active campaigns, fill rate, viewable impressions, clicks, CTR, renewals, sponsored reads | `AdStatDaily` · DB · GA4 |
| Credibility | referring domains (Search Console Links), direct + branded share, newsletter click rate (not opens — privacy proxies inflate them), Google News indexing | GSC · GA4 |
| Product | instance count, days-to-launch, template reuse (later) | register |

## 2. Measurement plan (key = GA4 key event). GA4 reserves `ad_impression`/`ad_click` → we use `ad_view`/`ad_clickout` ([reserved names](https://support.google.com/analytics/answer/13316687)).
| Event | Push location | Params | Key |
|---|---|---|---|
| `page_view`, `scroll` (90%), `view_search_results` | automatic; GTM derives `page_type` from path | — | — |
| `article_view` | `ArticleView.tsx` view-ping effect (non-preview) | article_id, content_category, content_author, is_sponsored | — |
| `read_complete` | `Progress()` in `ArticleView.tsx`: ≥75% scroll and ≥40% of `readMins` | article_id | — |
| `share` | `ShareRow` (`site.tsx`), `CardShare` (`blocks/share.tsx`) | method, item_id, share_location | — |
| `save_article` | with reader accounts (later) | item_id | — |
| `comment_submit` | `comments.tsx` on `r.ok` | article_id | — |
| `poll_vote` | `polls.ts` `vote()` on `r.ok` | poll_id, poll_slot | — |
| `newsletter_signup` | `newsletter.ts` `subscribe()` on `r.ok` | source, editions_count | yes |
| `newsletter_confirm` | `/newsletter/confirm` (double opt-in) | source | yes |
| `search_no_results` | `search/page.tsx` | search_term | — |
| `select_content` | related cards, «اقرأ أيضاً», prev/next, sidebar tabs | content_type, item_id | — |
| `ad_view` | `ZoneAd` (house mode), viewable | ad_zone, campaign_id, creative_id | — |
| `ad_clickout` | `ZoneAd` `<a>` click | same | — |
| `advertise_cta_click` | footer «أعلن معنا», `/advertise` | cta_location | — |
| `advertiser_contact_click` | `/advertise` contact links | method | yes |
| `submit_tip_click` | «ارسل خبراً» (`site.tsx`) | — | — |
| `social_follow_click` | footer icons | network | — |
| `pwa_install` | `appinstalled` in the layout BOOT script | — | — |
| `consent_update` | consent bar | analytics_storage | — |
Relation to `viewsCount`: same effect, different counting — GA4 counts consented, unblocked loads; the server counts once per tab session and per IP per 30 min (in memory, resets on restart, undercounts carrier NAT). Report GA4 as users/sessions and the server figure as "views"; reconcile for two weeks after launch. Not tracked: theme, font size, lightbox, edition chips.

## 3. GTM & GA4
- **Loading:** new `components/analytics.tsx` in `layout.tsx` loads GTM via `next/script` afterInteractive, skipped on `/dashboard|auth|offline` (same regex as `ads.tsx`); consent-default inline script in `<head>` before GTM.
- **Variables:** GA4 id constant; DLVs for params; regex table → `page_type`; custom JS `traffic_type` (internal when `localStorage.accessToken` exists).
- **Triggers:** Consent Initialization; Page View excluding staff paths; one Custom Event trigger on the event-name regex.
- **Tags:** one Google tag (`page_type`, `traffic_type`), one generic GA4 Event tag (`{{Event}}`).
- **Property:** one per instance; web stream on `https://mutabe3.news`; enhanced measurement on except outbound clicks/file downloads; event-scoped dimensions: content_category, content_author, article_id, is_sponsored, ad_zone, campaign_id, creative_id, share_location, source, page_type; key events as above; retention 14 months ([retention](https://support.google.com/analytics/answer/7667196)); Google Signals **off**; internal-traffic filter; link Search Console.
- **Server-side tagging: no** (~$45–120+/month + ops; recovers paid-platform conversions we don't have — [cost](https://stape.io/blog/how-much-does-server-gtm-cost)). **Meta Pixel/CAPI: deferred.**

## 4. Consent & privacy
- **Jordan PDPL 24/2023:** published 2023-09-17, in force 2024-03-17, grace period ended 2025-03-17; regulator = Personal Data Protection Council/Unit (MoDEE). Consent must be explicit, documented, purpose-specific, withdrawable; notice before processing; transfers abroad only to equivalent protection or with explicit consent (GA4 is such a transfer); breach notice 24h/72h; fines JOD 1,000–10,000 (+JOD 500/day). No cookie-specific rule found; enforcement record unknown → **review by counsel** ([Securiti](https://securiti.ai/jordan-personal-data-protection-law-of-2023/), [DLA Piper](https://www.dlapiperdataprotection.com/?t=law&c=JO)).
- **EEA/UK/CH:** Consent Mode v2 (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`), region defaults, `wait_for_update` 500, Advanced mode ([Google](https://developers.google.com/tag-platform/security/concepts/consent-mode)). A certified TCF CMP is needed only if AdSense/Ad Manager is switched on ([Google](https://support.google.com/adsense/answer/13554020)).
- **Default (open until counsel):** A(1) region-split (EEA denied, Jordan granted with opt-out) only if counsel clears it; otherwise A(2) denied everywhere + Advanced mode. One-constant switch.
- **UX:** one Arabic RTL bottom bar with equal-weight موافق / رفض; footer «إعدادات الخصوصية»; real privacy page; choice stored in `localStorage consent.v1`, re-asked after 12 months.
- **Storage inventory:** `authToken`/`refreshToken` httpOnly cookies (staff) = strictly necessary · localStorage tokens = necessary · theme, catmode, cname, editions, following, seen, lastVisit = functional · `voterId`/`poll:<id>` (stored as salted hash) = functional, disclose · `viewed:<id>` sessionStorage = necessary · `_ga*` (planned) = analytics, consent · AdSense cookies (only if enabled) = advertising, consent + CMP.
- **Newsletter:** move to **double opt-in** (overturns D-043 single opt-in): documented consent + deliverability while SPF/DKIM are missing.

## 5. In-admin analytics & ad stats
- `ArticleViewDaily(articleId, day, views)` upserted in `/api/articles/:id/view`; keep `viewsCount`; UA bot filter; skip staff tokens. `/dashboard/analytics`: per-article 24h/7d/30d, top content, daily trend, category split (weeks 9–12). Traffic sources later via GA4 Data API (read-only service account, 1h cache).
- Ad model (weeks 3–4): `Advertiser`, `Campaign(status, startsAt, endsAt, zones)`, `Creative(zone, image, href, size, approvedAt)` superseding `HouseBanner`; `AdStatDaily(day, zone, campaignId?, creativeId?, device, renders, viewable, clicks)` — null campaign = unfilled → fill rate. **No payment fields** (owner decision 4.3).
- Counting: one batched `sendBeacon('/api/ads/e')` per pageview on `pagehide` with each slot's viewable flag; viewable = ≥50% visible ≥1s with tab visible ([IAB/MRC](https://www.iab.com/news/mrc-lifts-advisory-against-transacting-on-viewable-display-impressions)); slots reserve `w`/`h` → CLS-safe; clicks beacon + keep real href with `rel=sponsored`; UTMs added at save time; server drops bot UAs, rate-limits, dedupes per (pageview, creative), excludes staff; no cookie or ID.
- Advertiser report (CSV/PDF from admin until the portal exists): renders, viewable impressions, clicks, CTR (clicks ÷ viewable), pacing, methodology footnote + monthly GA4 audience card.

## 6. Dashboards & UTM
Looker Studio: operator view (sessions, active campaigns, fill rate), newsroom view (top stories, source/medium, Discover via GSC, signups, `read_complete`, `search_no_results`, pending comments), advertiser audience-proof PDF. UTM: lowercase ASCII, never on internal links; `utm_source` whatsapp|facebook|x|telegram|instagram|youtube|newsletter|push|partner; `utm_medium` social|messaging|email|referral|display|sponsored; `utm_campaign` `yyyymm-slug` or `digest-yyyymmdd`; `utm_content` article id/placement; auto-append in `ShareRow`/`CardShare` and email templates.

## 7. Implementation order
1 GA4 property + GTM container + owner account (S) · 2 privacy page + consent bar (M) · 3 `analytics.tsx`, base tags, exclusions, `traffic_type` (S) · 4 reader dataLayer pushes (M) · 5 UTM on shares + newsletter (S) · 6 `ArticleViewDaily` + bot filter (S) · 7 Campaign/Creative schema + beacons + rollups (L, weeks 3–4) · 8 `/dashboard/analytics` (M, weeks 9–12) · 9 Looker Studio + GSC link (M) · 10 DebugView, regional consent tests, GA4-vs-server reconciliation (S).

## Open
GA4/GTM owner account (Rami) · counsel on PDPL stance for anonymous analytics/GA4 transfer (A1 vs A2) · advertiser metric definitions acceptable (viewable 50%/1s, CTR on viewable)?

**Update 2026-10-08 (D-074):** GA4 is loaded directly (G-YH1LGW1B1D) instead of through a GTM container, with **basic** consent (no Google request before «موافق») instead of advanced — PDPL is consent-only. Events in §2 are sent with `gtag('event', …)`; staff browsers carry `traffic_type=internal`. GTM remains possible via `NEXT_PUBLIC_GTM_ID`.
