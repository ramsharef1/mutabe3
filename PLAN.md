# mutabe3 · PLAN

**Current plan in five sections** (the Classic bundle reads exactly these). The full plan — identity, revenue map, design direction, findings, roadmap — is `brain/BIBLE.md`; every decision with its verification is in `brain/DECISIONS.md`.

---

## Decisions in force

- **D-050 · plan v2 "content first"** (2026-10-06): weeks 1–2 make it real · 3–4 sell · 5–8 brand · 9–12 grow. All four phases are built. Still deferred until after the first ad sale: advertiser portal, packaging for another newsroom, AI editor assist, Cloudflare, English edition, paid-notices pilot.
- **Persona:** client newsroom (1–3 editors, target 10+ articles/day); Rami builds and operates. Prices, invoicing and payment for ads stay outside the system; admins activate campaigns.
- **Revenue:** direct-sold banners with dates and first-party counts (D-057), sponsored articles labelled «إعلان» (D-056). No AdSense, no newsletter sponsorship for now. Unsold zones show the site's own «أعلن معنا» promo linking to /advertise (D-089).
- **Design:** Ink & Signal «حبر وإشارة» is the site's look since D-088 (client sign-off 2026-10-09); Noto Kufi + Noto Naskh only; `?skin=classic` shows the old look in one browser.
- **Stack:** Next 16.4 + React 19, Express + Prisma 7.10 + Postgres 13 on the shared Hostinger VPS, Node 22, CI deploys from `main` (D-084, D-056, D-079).
- **Launch (D-089, 2026-10-10, Rami: "launch today, empty"):** the site carries real content only — sample articles retired, illustrative blocks off, nothing invented on any page. The homepage works from zero articles up.
- **Alerts are GitHub Issues that mail Rami** (D-059); no outside uptime service (Q7, 2026-10-09).
- **Security baseline** (D-051, D-054, D-063, D-064, D-065, D-073, D-079): auth guards and throttling, refresh rotation, double opt-in, audit log, local-only ad creatives, per-reader limits, enforced CSP, Postgres local-only, generic error responses, uploads decided by content, links cut from comments, pinned SSH host keys, separate deploy user and secrets.

## Verified state

As of 2026-10-10 (details and evidence: `brain/DECISIONS.md`):
- **Build plan complete:** weeks 1–12 (D-051 … D-076), mail with SPF/DKIM/DMARC (D-077, D-078), GA4 behind the consent bar (D-074), Next 16 + Prisma 7 (D-084) with all lint rules on (D-085), dashboard articles table (D-087), dashboard sidebar (D-090).
- **Ink & Signal live (D-088);** its leftovers done in D-089: share image, favicon set, iPhone icon, email templates, Amiri dropped.
- **Launch homepage live (D-089):** every box shows only its own section and hides while empty; no story repeats; filler, dead tabs, dead links (header, footer, social) and invented content removed; the article page no longer pads plain text with invented paragraphs, quote, gallery or byline.
- **Ops:** shared-VPS units clean, security updates current, Postgres closed to the internet (D-060 … D-063), root-mail loop stopped (D-086).

## Priorities

1. **Real content.** The editors publish (target 10+ a day). The first ad sale, the media kit's audience numbers (after 30 days of measurement) and Google News all depend on it.
2. **Search Console (Q14).** Rami adds the Domain property; a session adds the TXT record through an ops action and Rami verifies; then both sitemaps are submitted.
3. **Library majors:** done (D-089) — bcrypt 6, nodemailer 10.0.10; real delivery through the VPS mail server not re-tested yet (`mail-test-mutabe3`, sends one test mail to info@ — Rami's go).
4. **After the first sale:** revisit the deferred list in Decisions in force.
Waiting on Rami: Q11 (push on the second device, postponed), Q14.

## Open questions

- **Q1 · Imprint** — **closed 2026-10-10:** owner/licensed entity and legal name «موقع المتابع الاخباري», editor-in-chief عدي عليان, عمّان — الأردن (live on /about).
- **Q2 · Analytics** — done (D-074); Rami's GA4 settings done 2026-10-09. Search Console moved to Q14.
- **Q3/Q5 · Mail and DNS** — done (D-077, D-078).
- **Q4 · Counsel** — no legal review for now (Rami, 2026-10-08); the «مسودة» banners stay on the seven legal pages until a lawyer approves them.
- **Q6 · Logo** — the re-drawn logo is the official logo (2026-10-08).
- **Q7 · Uptime** — no outside service; GitHub checks + the daily server check only (Rami, 2026-10-09).
- **Q8 · Kernel reboots** — on request; the Sunday digest says when one is needed.
- **Q9 · Samples** — **closed 2026-10-10:** retired at the public launch (D-089).
- **Q10 · Ink & Signal sign-off** — done (D-088).
- **Q11 · Web push for «عاجل»** — on since 2026-10-09; an alert reached one device but not another (no iPhone involved). *Investigation postponed by Rami.*
- **Q12 · Deploy user and separate secrets** — done (D-079).
- **Q13 · Data blocks** — done (D-076): «البيانات» page, live exchange rates, empty blocks hidden.
- **Q14 · Search Console** — *Rami:* in search.google.com/search-console (the Google account that owns GA4) → Add property → **Domain** → `mutabe3.news` → copy the TXT value. A session adds it to the DNS on the VPS (PowerDNS, as in D-077) through an ops action; Rami presses «Verify», then submits `sitemap.xml` and `news-sitemap.xml` under «Sitemaps».

## Resume point

Last session 2026-10-10 (Claude Code): D-089 launch code live — homepage, header/footer, article page, Ink leftovers, bcrypt 6 + nodemailer 10.0.10 with DKIM covering List-Unsubscribe-Post. D-084's duplicate renumbered (sidebar is D-090). Samples retired (150, kept as drafts) and demo blocks off — the site shows real content only. **Next:** Q14 Search Console when Rami has the TXT value; an optional `mail-test-mutabe3` run (sends one test mail to info@) if Rami agrees. Otherwise the site waits on real articles.

**Last updated:** 2026-10-10 (the 2026-09-12 plan is in `archive/2026-10-07-forge-refresh/`)
