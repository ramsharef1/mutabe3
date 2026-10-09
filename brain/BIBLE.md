# BIBLE — mutabe3 · موقع المتابع الاخباري
> Single source of truth. ARCHITECT-000 owns this file; every session reads it first and writes back to `/brain/` last. Written 2026-10-06 after a six-round wizard (see OPEN-QUESTIONS.md); plan v2 "content first" approved by Rami the same day (D-050).

## Identity & persona
- **Type:** Arabic-first (RTL) Jordanian online news publication — https://mutabe3.news · official name **موقع المتابع الاخباري**, logo word **المتابع**, sub-brands with the definite article (كتاب المتابع, ليالي المتابع, فيديو المتابع…). English/domain: mutabe3; future English edition label "Almutabe3 English".
- **Mission:** a fast, credible Jordanian news site that is honest about what it is (no demo data, labelled advertising, named responsible editor) and sells its own inventory directly.
- **Audience:** Jordan first (اخبار الاردن, البرلمان, محافظات), Palestine and the region; Arabic readers on mobile; advertisers in Jordan.
- **Owner persona:** **client newsroom** — the client's organisation owns the site and its 1–3 editors publish; **Rami Alsharef personally builds and operates the platform** (independent developer-operator; no connection to any agency). Editor-in-chief: **عدي عليان** (Q1, 2026-10-08, on /about and /contact); owner/licensed entity and legal name: **موقع المتابع الاخباري** (Q1, 2026-10-08; legal name confirmed 2026-10-10); city: **عمّان — الأردن** (2026-10-09).
- **Success by March 2027:** audience size · direct ad revenue · credibility/citations · a product that can be re-deployed for another newsroom later.
- **Launch posture:** public launch 2026-10-10 with real content only (D-089) while the Media Commission licence application is in progress — **⚠️ review by counsel** (Press & Publications Law; sites can be blocked administratively).
- **Content production:** editors write in the dashboard; target **10+ articles/day** → editor speed is a design goal (faster editor UX + templates per article kind; AI assist deferred).

## Revenue map → REVENUE-MAP.md · PRICING-LAUNCH.md
Direct-sold banners in the four live zones with start/end dates, plus sponsored articles labelled with the law's word **«إعلان»**. Prices, invoicing and payment are handled **entirely outside the system**; admins activate/deactivate campaigns. No AdSense, no newsletter sponsorship for now. **First sale needs:** real content · banner dates + impression/click counts (admin-only) · `/advertise` + simple media kit. Advertiser portal, paid notices, polling product and platform sales are later streams.

## Market gap map → MARKET.md
No Jordanian outlet publishes a rate card, labels sponsored content, names a licence or responsible editor in its footer; only Al-Ghad has a newsletter. Table stakes we lack: about/team/contact/privacy/corrections/advertise pages; Telegram, WhatsApp, Nabd distribution. Avoid pop-ups, autoplay, recommendation widgets, filler.

## Design direction → DESIGN-SYSTEM.md · tokens.json
**Direction A · حبر وإشارة (Ink & Signal)** on the frozen Ammon structure (1002px desktop, section order, densities, single-column mobile ≤767px, dark mode): ink `#0B0B0F`, paper `#FFFFFF`/`#F5F6F8`, **accent `#2E6DB4` sampled from the logo's medallion band**, red survives only as `live #D7262D` for عاجل plus a distinct `error`. Type: **Noto Kufi Arabic (headlines/UI) + Noto Naskh Arabic (everything else, including article body)** — Amiri dropped. **Live as the default since D-088 (client sign-off, 2026-10-09)**; `?skin=classic` shows the old look in one browser.

## Content architecture → CONTENT-ARCHITECTURE.md
13 live categories (رياضة hidden). Launch-integrity fixes first (dead footer links, ~20 demo blocks, duplicated category lists, missing photo credit, `dateModified` bumped by views). Content types to add: columnist/author pages, sponsored kind, video, caricature, live blog, nine static/legal pages; Arabic slug URLs with redirects from ids; three-level topical map with evergreen hubs. Since D-080 every section carried labelled sample material (`isSample`: «مادة تجريبية», noindex, out of sitemaps/RSS); Rami chose to launch with real content only on 2026-10-10 (D-089): samples retired, illustrative blocks off, every homepage box hides while its section is empty.

## Engagement / monetization backend → ADS-PLAN (in REVENUE-MAP.md §backend)
Zones + house banners + `rel=sponsored` + ads.txt, and since D-053…D-057: banner dates (`startAt`/`endAt`, inactive banners never served), first-party impression/click daily rollups (`AdStatDaily`, consent-independent, viewability floor 50 %/1 s, CSV report in the ads manager), the sponsored kind with exclusions, `/advertise` as the media kit. Ops alerts live (D-058→D-059: GitHub-Issue alerts that arrive as mail); the advertiser portal stays deferred. Newsletter → double opt-in + per-recipient delivery log; inbox delivery still blocked on SPF/DKIM DNS. Comments stay pre-moderated. Web push for عاجل in weeks 9–12.

## Analytics → ANALYTICS-PLAN.md
GA4 + GTM behind an Arabic consent bar (Jordan PDPL 24/2023 in force, grace period ended 2025-03-17; EEA via Consent Mode v2) for audience proof, **plus** first-party rollups (`ArticleViewDaily`, `AdStatDaily`) for money numbers. In-admin analytics dashboard in weeks 9–12. No server-side tagging, no Meta pixel.

## Stack & hosting → TECH-STACK.md · HOSTING-OPS.md · AI-FEATURES.md
Next 16.4 + React 19 (App Router, standalone, PWA) + Express/Prisma 7.10/Postgres 13 on a shared Hostinger VPS (AlmaLinux 9, nginx, systemd, service user `mutabe3`), GitHub Actions deploy + ops workflow, nightly dumps + weekly VPS backups. **Done in weeks 1–4:** Node 22, committed lockfile + `npm ci`, Dependabot, and alerts as GitHub Issues → mail (`monitor.yml`, D-059: uptime every 10 min, daily server facts, Sunday digest — no Postfix, since VPS mail stays blocked on SPF/DKIM). **Done since:** Next 16 + Prisma 7 (D-084), bcrypt 6 + nodemailer 10 (D-089). **Deferred (90+ days):** instance-per-client packaging, Cloudflare, AI editor assist, English edition.

## Security & legal → SECURITY.md · LEGAL/
Findings S-01…S-19 (2 critical, 8 high) — launch-critical subset fixed in weeks 1–2: auth input guards, login throttling, security headers, dependency patches, fail-fast secrets, refresh rotation, append-only audit log. Legal pack of 8 Arabic drafts marked **DRAFT — review by counsel**; imprint names the licence holder and editor-in-chief.

## Findings & recommendations
| ID | Finding | Severity | Status |
|---|---|---|---|
| F-01 | Footer links to about/contact/advertise/privacy/terms are dead (`#`); no imprint, corrections or privacy page | High | **in-progress (D-053)** — seven pages live as counsel drafts with a visible banner; footer wired; needs names, mailboxes and counsel sign-off |
| F-02 | ~20 homepage blocks, live strip, video, columnists and 19 articles are demo/invented data | High | **done (D-089)** — launched 2026-10-10 with real content only: samples retired, invented blocks off, «أعلن معنا» in unsold zones, filler/dead links removed, article page without invented dressing |
| F-03 | No photo credit field; every cover captioned «تصوير: المتابع» | High | **done (D-054)** — credit/caption fields, credit shown only when set, JSON-LD ImageObject |
| F-04 | `dateModified` = `updatedAt`, bumped by every view → fake freshness signal | Medium | **done (D-052)** — raw increment, `updatedAt` moves only on edits |
| F-05 | Category pages repeat articles and inflate counts; unknown slugs show other categories | Medium | **done (D-054, D-058)** — honest counts; server-side title/description/canonical + CollectionPage JSON-LD for category, tag and search pages; unknown category = 404; thin tags and search results `noindex` |
| F-06 | No analytics, no consent layer; PDPL requires explicit consent | High | **done (D-055, D-074)** — GA4 G-YH1LGW1B1D live behind the consent bar (basic consent: no Google request before «موافق»), site events flowing; Search Console still to connect |
| F-07 | Newsletter single opt-in re-activates unsubscribed emails; inbox delivery blocked on DNS | Medium | **done (D-054)** — double opt-in with confirmation mail; DNS (SPF/DKIM) still Rami's |
| F-08 | Banners have no dates or counts; no `/advertise`; no sponsored label | High (revenue) | **done in code (D-057)** — banner dates + first-party impression/click counts + CSV in the ads manager; «إعلان» label (D-056) with exclusions; `/advertise` is the media kit (D-053); audience numbers follow 30 days of measurement |
| F-09 | Production Node 20 past EOL; Next 14 unsupported; no lockfile | High | **done** — lockfile + `npm ci` (D-051), Node 22 (D-056), Next 16.4 + Prisma 7.10 (D-084) |
| F-10 | Security S-01…S-10 (see SECURITY.md) | Critical/High | **mostly done (D-051, D-054, D-064)** — auth guards, throttling, rotation, headers, double opt-in; audit log, local-only ad creatives, per-reader search/view limits, CSP enforced; S-01 done (D-084, D-089), S-07 deploy user done (D-079), S-11/S-12/S-17/S-19 done (D-065); open: CSP nonces (S-02) |
| F-11 | Newsletter send stuck in `sending` if the backend restarts mid-send | Medium | **done (D-054)** — per-recipient delivery log, resumable re-send, 30-minute reaper |
| F-12 | Every red on the site is Ammon legacy; logo has no red; dark-mode logo via CSS filter; OG card bakes the red bar | Medium | **done (D-088, D-089)** — Ink & Signal live; share image, favicon set, iPhone icon and mail templates regenerated |
| F-13 | 10+ articles/day target vs 1–3 editors | Risk | **done (D-056)** — templates per kind, Ctrl+S / Ctrl+Enter, remembered category, duplicate article; measure the desk's real output after launch |

## Roadmap (plan v2 — content first; effort S/M/L; gates in bold)
| Weeks | Scope | Effort | Gate |
|---|---|---|---|
| 1–2 · Make it real | Hide demo blocks/live/video/columnists; monogram avatars; photo credit + caption; `dateModified` fix; category pagination fix; footer pages as counsel-banner drafts; Google News readiness + Search Console; GA4 + consent bar; double opt-in + delivery log; launch-critical security; Node 22 + lockfile; faster editor UX + templates per kind | M | **names for the imprint · DNS for mail · demo-article removal asked separately** |
| 3–4 · Sell | Banner dates + impression/click rollups in the ads manager; `/advertise` + media kit; sponsored kind «إعلان» with exclusions; email alerts (uptime, backup age, disk) | M | **counsel on legal drafts · first terms agreed outside the system** |
| 5–8 · Brand | Ink & Signal re-theme in a worktree (skin toggle, Kufi + Naskh, OG/favicons regenerated), screenshots on real content | M | **client sign-off** |
| 9–12 · Grow | In-admin analytics; web push for عاجل; trigram search; paid-notices pilot (if wanted); Lighthouse pass | M | — |
| Deferred | Advertiser portal; instance-per-client packaging; Next 16; AI editor assist; Cloudflare; English edition | — | revisit after the first sale |

## Needs Rami (not derivable)
Search Console Domain property TXT value (PLAN Q14) · counsel's identity when a legal review happens · the push investigation when he picks it up (Q11).
