# mutabe3 · OPEN-QUESTIONS (ARCHITECT wizard log)

Status per item: **asked** · **answered** · **deferred** · **invalidated** (by a later answer) · **decided-by-architect** (logged guess, confirm or overturn).

## Run 1 — 2026-10-06 · Returning/Audit (brain existed without a Bible)

### Round 1
| # | Track | Question | Answer | Status |
|---|---|---|---|---|
| 1.1 | A | Who is mutabe3 for; who runs it day to day? | **Client newsroom** — Rami Alsharef personally builds and operates the platform (corrected in 5.3/6.1: no connection to Telescope Media Group), the client's editors publish | answered (corrected) |
| 1.2 | A | Success by end of March 2027? | **All four:** audience size · ad revenue · credibility & citations · a sellable product | answered |
| 1.3 | B/G | Revenue streams live within 6 months? | **Direct-sold banners + sponsored/native articles.** AdSense and newsletter sponsorship not now (note: ROADMAP's "waiting on AdSense id" is superseded by this) | answered |
| 1.4 | E/S | How is real content produced? | **Small desk, 1–3 editors** publishing daily | answered |

### Round 2
| # | Track | Question | Answer | Status |
|---|---|---|---|---|
| 2.1 | K/L | "Sellable product" shape? | Rami: *you decide*. **ARCHITECT: one codebase, one deploy per client** — each newsroom = its own VPS/DB instance from this repo, configured by env + a brand/theme file (tokens, logo, name, categories seed). Why: a 1–3 person desk and a first client don't justify multi-tenant isolation/billing; instance-per-client keeps data separation trivial (licensing, PDPL-style duties), reuses today's CI/ops scripts, and can still evolve to multi-tenant later. Licensing the code alone forfeits the operating revenue Rami wants. | decided-by-architect |
| 2.2 | D | Ammon-replica look permanent or a phase? | **Keep structure, own the brand** — same section order/densities; palette, type and components move to المتابع's own identity now. Direction chosen in Round 3. | answered |
| 2.3 | B/G | Who sells direct banners/sponsored, what tooling? | **Self-serve advertiser portal** — advertisers log in, book zones + dates, upload creatives, see stats, pay via a MENA gateway. Largest build in the plan; the newsroom approves creatives. | answered |
| 2.4 | P | Jordan Media Commission licence? | **Application in progress** → legal gate: real-content launch planned around it; imprint/about must name licence holder + editor-in-chief once known (names only). | answered |

### Round 3
| # | Track | Question | Answer | Status |
|---|---|---|---|---|
| 3.1 | D | Design direction? | **A · حبر وإشارة** — ink `#0B0B0F`, paper `#FFFFFF`/`#F5F6F8`, accent = the logo medallion blue (exact hex to be sampled from the artwork; fallback `#1F5FBF`), muted `#5B6472`, عاجل red `#D7262D` only; Noto Kufi headlines + Noto Naskh body; Ammon structure/densities kept | answered |
| 3.2 | B | Advertiser payments at launch? | **Manual** — bank transfer / CliQ, admin marks paid; no gateway | answered |
| 3.3 | B | Zone pricing in the portal? | **No pricing engine.** Commercial terms are agreed outside the system; admins activate/deactivate campaigns (with dates) in the admin panel. Refines 2.3: the portal = advertiser accounts, campaign requests (zones, dates), creative upload, approval, stats — not booking/checkout | answered |
| 3.4 | P | Real content vs pending licence? | **Soft launch now with news.** ⚠️ review by counsel — exposure under Jordan's Press & Publications Law until the Media Commission licence is granted; mitigations: imprint naming the responsible editor, corrections/right-of-reply policy, takedown contact, licence application prioritised | answered (legal flag) |

### Round 4 (after the first Holistic Plan)
| # | Track | Question | Answer | Status |
|---|---|---|---|---|
| 4.1 | all | Approve the Holistic Plan? | **Reopen the wizard** — Round 5 asks what changed | answered |
| 4.2 | M | Alert channel? | **Email** (via VPS Postfix / dashboard SMTP account; depends on the mail DNS fix) | answered |
| 4.3 | B | What does the system record when a campaign is paid? | **Nothing** — admins only activate/deactivate; payment tracked entirely outside the system (supersedes the portal's "paid" state) | answered |
| 4.4 | D | Article body type? | **Noto Naskh** for the body (Amiri dropped → two font families, faster first load) | answered |

### Round 5 (reopened wizard)
| # | Track | Question | Answer | Status |
|---|---|---|---|---|
| 5.1 | all | Which parts to reopen? | **All four** (revenue/portal · design · launch/legal/content · stack/packaging) | answered |
| 5.2 | all | What felt wrong? | **Too much scope / too slow to a first sale · wrong order · a wrong assumption** | answered |
| 5.3 | A | Which inference is wrong? | **"This website has nothing to do with Telescope."** → every mention of Telescope Media Group as builder/operator/seller is invalidated (Round 1 note, plan, track reports). Operating party to be named in Round 6 | answered — invalidates 1.1's "Rami/Telescope" wording |
| 5.4 | B | What must be live before the first paid campaign? | **Real content replacing the demo · banner dates + impression/click counts (admin-only) · /advertise page + simple media kit** — no portal needed for the first sale | answered |
| 5.5 | all | Order for the next 4 weeks? | **"Content first"** | answered |
| 5.6 | all | What to defer beyond 90 days? | No preference → **ARCHITECT defers:** advertiser portal, instance-per-client packaging, Next 16 upgrade (Node 22 + dependency patches stay), AI editor assist | decided-by-architect |

### Round 6
| # | Track | Question | Answer | Status |
|---|---|---|---|---|
| 6.1 | A | Who builds/operates, under what name? | **Rami Alsharef personally, for a client** — the client's organisation owns the site; client name still to be supplied | answered |
| 6.2 | E | Source of the first real content? | **Editors write in the dashboard** — no import or feed tooling | answered |
| 6.3 | E | Publishing target, first month? | **10+ articles a day** ⚠️ with a 1–3 editor desk (1.4) this is 4–10 pieces per editor daily → editor speed is a design goal; AI editor assist offered back as the lever (deferred unless asked) | answered (tension logged) |

### Round 7 (plan v2)
| # | Track | Question | Answer | Status |
|---|---|---|---|---|
| 7.1 | all | Approve plan v2 (content first)? | **Approved** — Bible + track files written; weeks 1–2 start, asking before demo deletion, DNS or breaking deploys | answered |
| 7.2 | E | Editor-speed levers for 10+/day? | **Faster editor UX + templates per article kind** (no AI assist) | answered |
| 7.3 | E/P | Demo articles in week 1? | **Keep until real content exists** — removal is a later, separately-asked gate; demo *blocks* are hidden in weeks 1–2 | answered |

### Decided by ARCHITECT (confirm or overturn)
- **Analytics:** GA4 + GTM for advertiser-facing audience proof **plus** in-admin analytics from the existing `viewsCount`; lightweight consent notice (Jordanian audience, EEA visitors handled by consent mode). Why: direct advertisers ask for GA numbers; self-hosted analytics alone won't be trusted by buyers.
- **Competitor set for the teardown:** ammonnews.net (model), khaberni.com, sarayanews.com, royanews.tv, alghad.com, jo24.net, alrai.com — Jordanian comparables first; one regional reference (alarabiya.net) for design/ads mechanics.
- **English edition:** stays "Later" (ROADMAP); the Bible reserves the `Almutabe3 English` label and locale slots.
- **Native app:** PWA is the mobile product for 2026; native wrapper considered after audience exists.
- **Sponsored content labelling:** Arabic label «محتوى إعلاني» on card + article, `rel="sponsored"` on outbound links, excluded from the Google News sitemap and RSS by default. Why: Google News and AdSense policies both require clear disclosure.

### Needs Rami to supply (not multiple-choice)
- Client's legal/organisation name and the responsible editor-in-chief (names only) — for imprint, about page, licence records.
- The original logo artwork file (current logo is a vector re-creation).
- A Google account to own the GA4 property (Rami's or the client's).
- DNS access/plan for SPF/DKIM so newsletter mail reaches inboxes (carried from D-043/D-044).

### Detected, not asked (from code + DECISIONS D-032 → D-049)
- Arabic-first, RTL, Jordan; 13 live categories; Ammon-replica desktop (1002px, #990000/#a80101, Noto Kufi/Naskh, Amiri body), single-column mobile, dark mode, PWA.
- Express + Prisma + Postgres, Next 14, Hostinger VPS, CI deploys, nightly + weekly backups, unprivileged service user, compiled backend.
- Live: roles, scheduling, curation, comments, polls, newsletter (inbox delivery blocked on DNS), ads manager (demo), WebP media pipeline, search, sitemaps/RSS/JSON-LD.
- Gaps: 19 demo articles with placeholder photos; columnists/video/live strip hardcoded; no about/contact/privacy/terms/advertise pages (footer links all point to `/`); no GA4 or consent layer; logo is a vector re-creation — original artwork never received; `FACTS.md` stale (Strapi/Vercel/Meilisearch/Sentry).
