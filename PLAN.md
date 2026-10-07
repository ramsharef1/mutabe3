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

1. **Rami's gates** (Open questions Q1–Q6) — they block the imprint, analytics, newsletter delivery and the legal go-ahead.
2. **Real uptime alerts** (Q7) — Better Stack chosen; two monitors (`/`, `/api/health`) once Rami's account exists.
3. **Remaining security items** — Prisma 5 / tsx 3 upgrades (S-19), HKDF sub-keys (S-05), nginx `server_tokens` + edge HSTS (S-02, ops), non-root deploy user + pinned host key (S-07); Next 16 with the deferred upgrade.
4. **Weeks 5–8 · brand:** Ink & Signal built as a per-browser preview on branch `worktree-ink-skin` (D-066), review page sent for **client sign-off (Q10)**; after it: merge as default, regenerate OG/favicons/email shell.
5. **Weeks 9–12 · grow:** in-admin analytics, web push for عاجل, Arabic trigram search, Lighthouse pass, paid-notices pilot if wanted.

## Open questions

- **Q1 · Imprint names** — client legal name and editor-in-chief. *Needed for the about page, imprint and licence records.*
- **Q2 · GTM container id** — from the Google account that owns GA4. *Analytics and the consent bar switch on with it; nothing else to build.*
- **Q3 · Mailboxes** — editor@, ads@, corrections@, privacy@ on mutabe3.news. *The legal pages and `/advertise` point to them.*
- **Q4 · Counsel** — who reviews the seven legal drafts and the soft-launch-before-licence posture. *Recommendation: before real traffic.*
- **Q5 · SPF/DKIM DNS** at webhubteam's name servers. *Without them newsletter mail does not reach inboxes; alerts already work through GitHub.*
- **Q6 · Original logo artwork file.** *The current logo is a vector re-creation; the re-theme needs the original.*
- **Q7 · Uptime checker — Better Stack chosen (2026-10-08).** *Waiting on Rami:* sign up for Better Stack Uptime (free) — in the Claude browser pane if a session should then create the two monitors (spec: `brain/HOSTING-OPS.md` → External checker), or create them by hand from that spec.
- **Q8 · Kernel reboots** — dnf-automatic installs kernels but never reboots: (a) reboot on request, as on 2026-10-07; (b) a weekly reboot only when needed, Sundays 04:30 Amman (about one minute down). *Recommendation: (b).*
- **Q9 · Demo articles** — when to remove the 19 demo articles. *Recommendation: once the desk has published about 20 real ones.*
- **Q10 · Ink & Signal sign-off** — the client answers the three questions on the review page (https://claude.ai/artifact/UnyMrjMLQa73vwSL5CDpc6, private: Rami shares it): blue from the logo as the main colour, red only for «عاجل»/«مباشر», Naskh instead of Amiri for article text. *Yes → merge `worktree-ink-skin` and make ink the default.*

## Resume point

Last session 2026-10-08 (Claude Code): D-057 … D-065 live; D-066 Ink & Signal built on branch `worktree-ink-skin` (not deployed), waiting for client sign-off (Q10). The next session starts from Priorities: answers to Q1–Q9 unblock their items; without them, item 3 (remaining security items) or item 4 (the Ink & Signal skin in a worktree) is the next slice that needs nobody.

**Last updated:** 2026-10-08 (the 2026-09-12 plan is in `archive/2026-10-07-forge-refresh/`)
