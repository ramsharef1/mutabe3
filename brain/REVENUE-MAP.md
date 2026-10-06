# REVENUE-MAP — mutabe3
Status: approved with plan v2 (D-050, 2026-10-06). Owner answers: direct-sold banners + sponsored articles within 6 months; no AdSense, no newsletter sponsorship now; prices, invoices and payments handled **outside the system**; admins activate/deactivate campaigns; advertiser portal deferred past 90 days.

## 1. Primary model
Direct-sold banner campaigns with start/end dates in the four live zones (header 728×90 · in-row · in-article · sidebar 300×250 · 320×100 mobile), plus sponsored articles. Prices agreed by the seller outside the system; payment by bank transfer / CliQ, tracked outside; the admin panel only switches campaigns on/off and shows delivery numbers.

**Legal anchor:** Press & Publications Law Art. 30(b) — paid material must be clearly marked «إعلان» ([text](https://jordanianlaw.com/?p=4856), review by counsel). Google News requires sponsorship disclosure ([policy](https://support.google.com/news/publisher-center/answer/6204050)); articles sold to manipulate rankings are spam ([Google](https://developers.google.com/search/docs/essentials/spam-policies)); paid links carry `rel="sponsored"` ([Google](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links)).

## 2. Conversion architecture (every CTA → what happens → event → KPI)
| CTA (where) | After | GA4 event | KPI |
|---|---|---|---|
| Newsletter signup (capture card, footer, end of article) | subscription saved → confirmation mail (double opt-in) once DNS is fixed | `newsletter_signup`, `newsletter_confirm` | subscribers, signup rate |
| Social follow (header, end of article) | opens platform | `social_follow_click` | followers (logged weekly) |
| «تطبيق المتابع» (footer) | PWA install prompt | `pwa_install` | installs |
| Vote / comment / share | existing flows | `poll_vote` · `comment_submit` · `share` | engaged sessions |
| Send a tip / request a correction (article footer, /contact) | desk inbox | `tip_submit` · `correction_request` | credibility (response time set by the desk) |
| «أعلن معنا» (footer; house banner when a slot is unsold) | `/advertise` | `advertise_click` | advertiser leads |
| Media kit (`/advertise`) | HTML page (+ PDF later) | `media_kit_view` | kit views |
| Contact the seller (email/WhatsApp on `/advertise`) | conversation outside the system | `advertiser_contact_click` | leads |
| Campaign set live by admin | banners served with dates; counts accrue | — | campaigns live, impressions delivered, CTR |
| Report sent to advertiser (CSV/PDF from the ads manager) | renewal conversation | — | renewal rate |

**Lead pipeline (light):** capture (`/advertise` contact) → qualify by the seller → agree terms outside → admin creates campaign (zones, dates, creatives) → live → report → renew. Lead storage: a simple `Advertiser` + `Campaign` record in the admin (name, contact, zones, dates, status, notes) — no payment fields (owner decision 4.3).

## 3. Sponsored-content policy
- **Label:** «إعلان» on cards and in listings; «محتوى مدفوع من ‹الجهة›» at the top of the article; commercial-desk byline, never a newsroom journalist's.
- **Links & placement:** every outbound link `rel="sponsored"`; excluded from `news-sitemap.xml`, RSS, the lead story, breaking and editor's picks; outside most-read.
- **Refused:** unlabelled material; link/ranking articles sold for SEO; sponsors who are parties to a story being covered; sponsor approval of news content; unlicensed medical/financial/gambling offers; political material outside election rules (counsel decides).

## 4. Media kit (sections; numbers only after 30 days of GA4, each stamped with range + source)
1. Who we are — licence status, editor-in-chief, policies. 2. Audience — users, pageviews, devices, country/city (GA4); subscribers (DB); followers (platform insights). 3. Formats — 728×90, in-row, in-article, 300×250, 320×100 ([IAB sizes](https://www.iab.com/wp-content/uploads/2019/04/IABNewAdPortfolio_LW_FixedSizeSpec.pdf)); sponsored packages. 4. Sample campaign report (own counts). 5. Specs & lead times. 6. How to book — contact the seller; payment by bank transfer / CliQ ([JoPACC](https://www.jopacc.com/what-we-do/services-products/cliq-services)); invoicing via the seller's e-invoicing ([JoFotara mandatory since 2025-04-01](https://www.cleartax.com/jo/jordan-e-invoicing)). 7. Contact.

## 5. Secondary & invented streams (ranked)
| Stream | Why | Effort | When | Live example |
|---|---|---|---|---|
| Paid notices — وفيات / تهاني / عطاءات as a "notice" kind | established habit on Jordanian sites | S | weeks 9–12 pilot (if wanted) | [Ammon sections](https://www.ammonnews.net/category/60) |
| Data/poll product with a licensed polling firm | credibility + citations; sponsorable; site polls are not representative and must never be sold as surveys | M | months 4–6 | [Arab News × YouGov](https://www.arabnews.com/yougov) |
| Platform for other newsrooms (one deploy per client) | the "sellable product" goal | M | after the first sale; one-page pitch | [WhiteBeard](https://newsinitiative.withgoogle.com/cms-providers/whitebeard/) |
| Newsletter sponsorship (owner deferred) | needs DNS + a list first | S | after 6 months | [Enterprise](https://enterpriseam.com/egypt/2016/09/02/were-doubling-down-on-egypt-and-putting-enterprise-gcc-on-hiatus/) |
| WhatsApp channel ("presented by" later) | distribution now, sponsorship later | S | now / later | [Meta channels](https://about.fb.com/news/2025/06/helping-you-find-more-channels-businesses-on-whatsapp/) |
| Events & awards | high value, heavy lift | L | after 6 months | [EnterpriseAM Forum](https://enterpriseam.com/egypt/2025/10/08/its-a-wrap-on-the-2025-enterpriseam-egypt-forum/) |
Not recommended: classifieds marketplace ([OpenSooq dominates](https://www.wamda.com/2021/06/opensooq-raises-24-million-classifieds-marketplace)); video pre-roll (no hosted video; start a YouTube channel first). Nabd ([1,000+ Arabic publishers](https://www.zawya.com/en/press-release/nabd-overtakes-social-media-in-driving-traffic-to-key-publishers-in-mena-p80ntdnt)) brings traffic, not revenue — join in weeks 1–2.

## 6. Revenue-readiness backend checklist
| Item | Status |
|---|---|
| Zones, rotation (≤6 banners/zone), mobile creative, `rel=sponsored`, ads.txt | exists |
| Structured data, news sitemap | exists |
| Newsletter | partial — delivery blocked on DNS; single opt-in → double |
| Creative upload (staff, WebP pipeline) | exists |
| In-admin analytics | partial — `viewsCount` only |
| Banner start/end dates | **missing → weeks 3–4** |
| Impression/click daily rollups | **missing → weeks 3–4** |
| Advertiser/campaign record (no payment fields) | **missing → weeks 3–4** |
| Sponsored flag + sitemap/RSS exclusion + label | **missing → weeks 3–4** |
| Consent notice + GA4 | **missing → weeks 1–2** |
| `/advertise` + media kit page | **missing → weeks 3–4** |
| Imprint, privacy, terms, ad policy, corrections pages | **missing → weeks 1–2 (drafts)** |
| Advertiser self-serve portal, stats login | deferred (90+ days) |

Sources: see MARKET.md and PRICING-LAUNCH.md.
