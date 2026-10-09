# mutabe3 · PLAN

**Current plan in five sections** (the Classic bundle reads exactly these). The full plan — identity, revenue map, design direction, findings, roadmap — is `brain/BIBLE.md`; every decision with its verification is in `brain/DECISIONS.md`.

---

## Decisions in force

- **D-050 · plan v2 "content first"** (2026-10-06): weeks 1–2 make it real · 3–4 sell · 5–8 brand · 9–12 grow; advertiser portal, packaging, Next 16, AI assist, Cloudflare and the English edition deferred.
- **Persona:** client newsroom (1–3 editors, target 10+ articles/day); Rami builds and operates. Prices, invoicing and payment for ads stay outside the system; admins activate campaigns.
- **Revenue:** direct-sold banners with dates and first-party counts (D-057), sponsored articles labelled «إعلان» (D-056). No AdSense, no newsletter sponsorship for now.
- **Design direction A «حبر وإشارة»** (Ink & Signal) on the frozen Ammon structure — built later as a skin toggle; client sign-off is the gate.
- **Stack:** Next 14 + Express/Prisma/Postgres on the shared Hostinger VPS, Node 22, CI deploys from `main` (D-039, D-049, D-051, D-056).
- **Demo articles stay public until real content exists** — removal is asked separately.
- **Alerts are GitHub Issues that mail Rami** (D-059); no mail server until SPF/DKIM exist.
- **Security baseline** (D-051, D-054, D-063, D-064, D-065): auth guards and throttling, refresh rotation, double opt-in, audit log, local-only ad creatives, per-reader limits, enforced CSP, Postgres local-only, generic error responses, uploads decided by content, links cut from comments.

## Verified state

As of 2026-10-07 (details and evidence: `brain/DECISIONS.md` D-051 … D-065):
- **Weeks 1–2 done:** demo-block switch, honest dates and counts, photo credit/caption, seven legal pages as counsel drafts, Google News readiness, double opt-in newsletter with delivery log, launch-critical security, Node 22 + lockfile, faster editor with templates per article kind, GTM + consent bar (dormant).
- **Weeks 3–4 done:** banner dates + impression/click counts + CSV (D-057), search-engine titles for list pages (D-058), alerts + weekly digest (D-059).
- **Ops 2026-10-07:** shared-VPS failed units cleared (D-060), security packages current with dnf-automatic healthy (D-061), rebooted into the patched kernel with nginx now enabled at boot (D-062), Postgres closed to the internet (D-063).
- **Security slice live (D-064):** audit log at `/dashboard/audit`, banner creatives local-only, search 90/min and counted views capped per reader, CSP enforced with a report endpoint.
- **Security slice 2 live (D-065):** generic Arabic error responses with stable codes (S-12), uploads typed by their bytes and always re-encoded (S-11), CORS without the raw IP (S-17), links cut from reader comments (S-13), unused redis removed (S-19).

## Priorities

Build order chosen by Rami 2026-10-08 ("everything"), one slice at a time, each verified locally then on production:
1. **Real people and data:** ✅ author profiles live (D-067, opt-in by job title). Demo data blocks are already behind the demo switch (D-052); sourcing live feeds (FX, roads, obituaries) not started.
2. **Content types:** ✅ video, caricature and live blog live (D-068).
3. **Ops:** ~~weekly conditional kernel reboot~~ — dropped 2026-10-08; reboots on request (Q8).
4. **Weeks 9–12 · grow:** ✅ in-admin analytics (D-069), ✅ Lighthouse pass (D-070: mobile 95–97, accessibility 97–100), ✅ Arabic search (D-071), ✅ web push for عاجل built, off until Q11 (D-072).
5. **Remaining security:** ✅ Prisma 6 + tsx 4, per-purpose secret keys, pinned SSH host keys, nginx version hidden (D-073); deploy user + separate secrets wait for Q12.
Waiting on others: Rami's items Q1, Q2 id, Q3/Q5 DNS, Q6 logo; client's design answers (Q10).

## Open questions

- **Q1 · Imprint names** — client legal name and editor-in-chief. *Needed for the about page, imprint and licence records.* **Answered 2026-10-08: editor-in-chief عدي عليان**; organisation legal name still to come. **Owner/licensed entity 2026-10-08: «موقع المتابع الاخباري»** (live on /about, /privacy); city still to come. **City 2026-10-09: عمّان — الأردن** (live on /about).
- **Q2 · Analytics** — **done 2026-10-08 (D-074):** GA4 G-YH1LGW1B1D live behind the consent bar. *Rami, in GA4:* activate the «Internal Traffic» data filter, set retention to 14 months; connect Search Console when convenient.
- **Q3 · Mailboxes** — **answered 2026-10-08: forwarding** of editor@, ads@, corrections@, privacy@ to the editors' existing inboxes. *Waiting on Rami: MX/forwarding records at the DNS host (same visit as Q5) and the target addresses.* **Done 2026-10-08 (D-077):** info@mutabe3.news mailbox; editor@, ads@, corrections@, privacy@, noreply@ delivered to it.
- **Q4 · Counsel** — **answered 2026-10-08: no legal review for now** (Rami's decision; higher legal risk accepted). The «مسودة» banners stay on the seven legal pages until a lawyer approves them.
- **Q5 · SPF/DKIM DNS** at webhubteam's name servers. *Without them newsletter mail does not reach inboxes; alerts already work through GitHub.* **Answered 2026-10-08:** Claude writes the exact records (SPF, DKIM, DMARC, forwarding), Rami enters them in the DNS panel, Claude verifies live. **Done 2026-10-08 (D-077):** DNS is on the VPS (PowerDNS) — SPF, DKIM (app-signed, selector m3), DMARC p=none and MX added; test mail passes DKIM/SPF/DMARC.
- **Q6 · Original logo artwork file.** *The current logo is a vector re-creation; the re-theme needs the original.* **Answered 2026-10-08: keep the re-drawn logo** as the official logo.
- **Q7 · Uptime checker** — **answered 2026-10-08: leave it for now** (Better Stack dropped). Only the slow GitHub probe and the daily server check run; no real-time down alert. **Reopened 2026-10-08 (D-083):** GitHub ran only 5 of ~108 scheduled uptime checks in 18 h; a dependable check needs an outside service account (Rami). **Answered 2026-10-08: UptimeRobot free** — Rami creates the account and two 5-minute monitors (homepage, /api/health) with email + app alerts; the GitHub uptime job stays as a second opinion. **Changed 2026-10-09: skip outside uptime monitoring** — GitHub checks + the daily server check only (Rami).
- **Q8 · Kernel reboots** — **changed 2026-10-08: on request.** The Sunday digest shows «إعادة تشغيل مطلوبة نعم/لا» with the kernel versions; when it says yes, Rami asks and a session runs the `reboot` ops action with the D-062 pre-flight and checks from outside. No unattended reboot while there is no real-time uptime alert (Q7); revisit once one exists.
- **Q9 · Demo articles** — **answered 2026-10-08: after ~20 real articles** are published, then delete the 19 demo articles and switch the demo blocks off. **2026-10-08 (D-080):** 0 real articles yet → Rami chose labelled sample articles for every section (52, noindex, out of sitemaps/RSS); «إخفاء كل المواد التجريبية» in /dashboard/homepage retires them when real content arrives. **2026-10-09: keep the samples longer** — until the client approves the site and launches publicly (Rami).
- **Q10 · Ink & Signal sign-off** — **answered 2026-10-08: Rami shares the review page** (https://claude.ai/artifact/UnyMrjMLQa73vwSL5CDpc6) with the client and passes on their answers to the three questions. *Yes → merge `worktree-ink-skin` and make ink the default.*
- **Q11 · Web push for «عاجل»** — built and deployed **off** (D-072). *Rami:* open `/dashboard/push` → «تشغيل التنبيهات», tap «فعّل تنبيهات عاجل» in the site footer on a phone (Android Chrome, or the installed app on iPhone), then send one test alert from the dashboard. Switching it on shows the opt-in button to all readers; nobody is prompted automatically. **Answered 2026-10-08:** Rami switches on and tests from his phone; Claude watches delivery server-side. **2026-10-09:** Rami switched push on and tested it (arrived on one device, not on another — no iPhone involved; investigation postponed by Rami).
- **Q12 · Deploy user and separate secrets** (S-07, S-05) — deploys and ops still log in as the server's administrator account, and all app keys derive from one JWT_SECRET. *Proposal:* an ops action creates a `mutabe3-deploy` user whose sudo allows only the mutabe3 units, the checkout and nginx reload; a new deploy key goes to that user; Rami replaces the GitHub `production` secrets `VPS_USER`/`VPS_SSH_KEY`; then the old key is removed. Separate `SEAL_SECRET`/`FINGERPRINT_SALT` in `/etc/mutabe3/backend.env` at the same visit (stored seals are re-sealed on read). *Needs Rami: credentials and deploy-target change (LAW 3).* **Answered 2026-10-08: yes, now** — next slice. **Done 2026-10-08 (D-079):** deploys run as `mutabe3-deploy` with their own key; SEAL_SECRET and FINGERPRINT_SALT separate; ops/monitor keep the administrator key.
- **Q13 · Demo data blocks** (roads/crossings, markets, obituaries, jobs, cabinet decisions, MP votes, fact-check, greetings) — today they are illustrative and switch off with the demo switch (Q9). (a) *Recommended:* drop them when the demo switch goes off and add back only what the desk will keep current; (b) an editor-managed «بيانات» page in the dashboard where the desk types these values (one slice per block type); (c) live feeds — only FX has a free source; the rest have none or need paid licences. **Answered 2026-10-08: all three → done (D-076):** the «البيانات» page, live exchange rates, and empty blocks hidden with the demo switch off.

## Resume point

Last session 2026-10-08 (Claude Code): D-057 … D-065 and D-067 live; D-066 Ink & Signal built on branch `worktree-ink-skin` (not deployed), waiting for client sign-off (Q10). D-068 video/caricature/live blog live. D-069 … D-071 and D-073 live; D-072 web push deployed and off (Q11). The build plan is complete; GA4 live (D-074). Homepage data blocks editor-managed with live FX (D-076, Q13). What remains waits on Rami's answers (Q1, Q3/Q5 DNS, Q6, Q10–Q12) and on real content (Q9). The next session starts from Priorities: answers to Q1–Q9 unblock their items; without them, item 3 (remaining security items) or item 4 (the Ink & Signal skin in a worktree) is the next slice that needs nobody.

**Last updated:** 2026-10-08 (answers to Q2–Q4, Q7–Q10) (the 2026-09-12 plan is in `archive/2026-10-07-forge-refresh/`)
