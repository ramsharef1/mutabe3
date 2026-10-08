# mutabe3 · WORKLOG

**Session log.** Newest first. Every turn appends here with turn number, what was done, result/status.

> Between 2026-09-12 and 2026-10-06 the work was logged per decision in `brain/DECISIONS.md` (D-027 … D-055) instead of here.

---

## 2026-10-08 · Claude Code · imprint owner name (Q1)

- **Live (555f01c):** «موقع المتابع الاخباري» as owner and licensed entity on /about and /privacy; «قيد التفعيل» removed from the mail addresses (live since D-077). City still a placeholder.

---

## 2026-10-08 · Claude Code · monitor on a read-only user (D-081)

- **Live:** root facts timer + `mutabe3-monitor` (key can only `cat` the facts file); stale-facts alert. Manual check green. Only manual ops still uses the administrator key.

---

## 2026-10-08 · Claude Code · sample material for every section (D-080)

- **Live:** 33 new labelled samples (3 per empty section) + the 19 demo articles flagged; «مادة تجريبية» label, noindex, out of sitemaps/RSS; one-click hide/restore in /dashboard/homepage.

---

## 2026-10-08 · Claude Code · deploy user + separate secrets (D-079)

- **Live:** deploys as `mutabe3-deploy` (own key, no root; sudo only for the prepare/finish helper); SEAL_SECRET + FINGERPRINT_SALT separate from JWT_SECRET. First unprivileged deploy green, 0 permission errors, ISR cache writes fine.
- **Left:** ops/monitor still use the administrator key (ops needs root by design).

---

## 2026-10-08 · Claude Code · mail certificate (D-078)

- **Live:** mail.mutabe3.news certificate on SMTP/IMAP/submission via SNI, auto-renewing; guard re-adds our SNI entry if the control agent regenerates the map. Next: Q12.

---

## 2026-10-08 · Claude Code · mail for mutabe3.news (D-077)

- **Live:** SPF, DKIM (app-signed, `m3`), DMARC p=none, MX in the VPS's PowerDNS; info@mutabe3.news mailbox with editor@/ads@/corrections@/privacy@/noreply@ → info@. Test mail: DKIM/SPF/DMARC pass, delivered to info@.
- **Open:** TLS cert for mail.mutabe3.news (clients warn); Rami reads the info@ password from `/root/mutabe3-info-mailbox.txt`. Mail loop of another site reported, not touched.

---

## 2026-10-08 · Claude Code · answers applied (Q1, Q5, Q6, Q11, Q12)

- **Live (039259b):** editor-in-chief عدي عليان on /about and /contact; organisation legal name and city still placeholders.
- **Recorded:** Q6 keep the re-drawn logo; Q5 Claude writes the DNS records, Rami enters them; Q11 Rami switches push on and tests; Q12 next slice; GA4 steps given to Rami.

---

## 2026-10-08 · Claude Code · homepage data blocks (D-076)

- **Shipped (300fc55):** «البيانات» dashboard page for 11 data blocks the desk keeps current (each hidden once stale), live USD/EUR/Gulf rates with attribution, and no invented data on the homepage once the demo switch is off.
- **Production check:** rates live (USD 0.709 · EUR 0.794 · SAR 0.189), dashboard page loads, nothing saved.
- **Next for the desk:** fill the blocks it will maintain; Q9 (demo switch off) after ~20 real articles.

---

## 2026-10-08 · Claude Code · loose ends (D-075)

- Daily statistics confirmed on production (4 real reads today). Ticker pause button: not a defect (bottom overlays). Prisma 7 and CSP nonces: not now, with reasons. Demo data blocks: decision for Rami (PLAN Q13).

---

## 2026-10-08 · Claude Code · Google Analytics 4 (D-074)

- **Shipped (99766b0):** GA4 G-YH1LGW1B1D behind the consent bar, basic consent, production hosts only, staff marked internal, site events via gtag.
- **Production check:** no Google request before consent or after refusal; page_view and article_view collected after «موافق»; no CSP errors.
- **For Rami in GA4:** activate the Internal Traffic filter; retention 14 months.

---

## 2026-10-08 · Claude Code · security slice 3 (D-073)

- **Shipped:** Prisma 6 + tsx 4 (production "already in sync"), per-purpose HKDF keys for sealed secrets, SSH host keys pinned in deploy/ops/monitor, nginx version hidden on the shared VPS (pre-flight + automatic rollback; all 11 sites unchanged).
- **Waiting:** non-root deploy user and separate env secrets (PLAN Q12, Rami).
- **Status:** ✅ build plan complete · the rest waits on Rami's answers and real content.

---

## 2026-10-08 · Claude Code · web push for عاجل (D-072)

- **Deployed off (743d2b7):** opt-in button (footer + عاجل bar), service-worker alerts, `/dashboard/push` with confirm + 10-minute gap, keys sealed in the DB, endpoints limited to real push services.
- **Verified:** delivery through the real send code to an HTTPS fake push service, payload decrypted; production endpoints answer «off».
- **Waiting:** Rami switches it on and tests on a real phone (PLAN Q11).

---

## 2026-10-08 · Claude Code · Arabic search (D-071)

- **Shipped (8acfd6f):** normalised search text per article, prefix-aware stems, relevance ranking, «هل تقصد…». No database extension needed.
- **Production:** «بالأردن» 0 → 11 results, «الحُكومة» 0 → 2, typo «الحكومه تطلف» → «الحكومة تطلق»; dateModified untouched.
- **Status:** ✅ nothing in flight · next: web push for عاجل.

---

## 2026-10-08 · Claude Code · Lighthouse pass (D-070)

- **Shipped (fc08f78 … c4ee4a5):** one preloaded font, gzip API, category/article lists server-rendered, eager lead images, live strip server-rendered (CLS 0.112 → 0.006), Amman clock everywhere, accessibility fixes.
- **Production (real throttling):** home 95/97, article 97/100, category 97/100 (performance/accessibility); LCP 2.2–2.3 s; best practices and SEO 100.
- **Status:** ✅ nothing in flight · next: Arabic search, web push.

---

## 2026-10-08 · Claude Code · newsroom statistics (D-069)

- **Q8 changed:** reboots on request when the Sunday digest says so.
- **Shipped and verified (92fd034):** `ArticleViewDaily` (daily reads per article, Amman days) and «الإحصاءات» for editors — reads per day, most read, sections, writers, desk output vs 10/day, newsletter, comments, ads.
- **Status:** ✅ nothing in flight · next: Lighthouse pass, Arabic search, web push.

---

## 2026-10-08 · Claude Code · video, caricature, live blog (D-068)

- **Shipped and verified (b9422b1 + d6ffe55):** live-blog entries with an editor panel, self-refreshing live blog with LiveBlogPosting, real homepage live strip; video section from VIDEO articles with VideoObject; caricature block and uncropped page; templates for the three kinds; `?kind=` list filter.
- **Caught after the first deploy:** a caricature block briefly held a news article (old API ignored `?kind=`, answer cached 60 s) — self-cleared; the homepage now checks the kind itself.
- **Status:** ✅ nothing in flight · next: weekly conditional kernel reboot (Q8).

---

## 2026-10-08 · Claude Code · author profiles (D-067)

- **Answers recorded** (PLAN): Q2 Rami's Google account, Q3 forwarding, Q4 no legal review for now, Q7 leave, Q8 weekly conditional reboot, Q9 after ~20 real articles, Q10 Rami shares the review page; build order "everything".
- **Shipped and verified (277d6ef, run 37691423229):** opt-in `/author/<slug>` pages, real «كتاب المتابع» band, linked bylines, «ملفي العام» in the dashboard. No reader-visible change until a writer fills in الصفة.
- **Caught before deploy:** a `@unique` slug would have stopped the deploy's `db push`; without opt-in the shared «مسؤول» account would have got a public page.
- **Status:** ✅ nothing in flight · next: video / caricature / live-blog pages.

---

## 2026-10-08 · Claude Code · Ink & Signal skin (D-066)

- **Built (branch `worktree-ink-skin`, 523600f, not deployed):** brand reds and font stacks read `--k-<role>` variables with the classic value as fallback; `skin-ink.css` defines them from `tokens.json`; `?skin=ink` previews per browser. Classic proven unchanged (computed styles, 9 page/mode combinations, 0 differences). Density measured and fixed (Naskh 700 list titles, nav 13 px, root line-height).
- **Review page for the client:** https://claude.ai/artifact/UnyMrjMLQa73vwSL5CDpc6 (private).
- **Status:** ⏸ waiting for client sign-off (PLAN Q10).

---

## 2026-10-07 · Claude Code · security slice 2 (D-065)

- **Shipped and verified on production (cb47c6f, run 37682500545):** generic Arabic error responses with stable codes through one `sendError()` (S-12, 52 sites); uploads typed by their bytes, always re-encoded to WebP, failures refused, `nosniff` checked (S-11); CORS without the raw IP, `CORS_ORIGINS` optional (S-17); links cut from reader comments (S-13); unused `redis` removed (S-19). Evidence in `brain/DECISIONS.md` D-065.
- **Not verified on production:** GIF / truncated-image uploads and a forced 5xx (local only).
- **Status:** ✅ nothing in flight · still open: Prisma 5 / tsx 3 upgrades.

---

## 2026-10-07 · Claude Code · weeks 3–4, VPS housekeeping, security slice, Classic refresh

- **Shipped and verified on production:** D-057 ad basics · D-058 list-page titles · D-059 alerts as GitHub Issues + Sunday digest · D-060 shared-VPS failed units cleared · D-061 security packages (vim; Apache held) · D-062 reboot into kernel 687.54.1, nginx enabled at boot · D-063 Postgres closed to the internet · D-064 audit log, local-only ad creatives, per-reader search/view limits, CSP enforced. Evidence per item in `brain/DECISIONS.md`.
- **Found:** GitHub fires the 10-minute uptime schedule only every few hours → external checker needed (PLAN Q7).
- **FORGE / Classic:** front door, FACTS and PLAN rewritten from the BIBLE and verified facts (September versions archived in `archive/2026-10-07-forge-refresh/`), root DECISIONS marked superseded, REGISTRY row updated, `classic/mutabe3.md` regenerated for the claude.ai Project `forge · mutabe3`.
- **Status:** ✅ nothing in flight · next: PLAN → Priorities.

---

## [Turn 1] 2026-09-12 · Architecture phase → Forge structure

**Session:** mutabe3-master (Claude Code)  
**Owner:** Claude  
**Input:** "Create sessions to build mutabe3 news agency website"

**What was done:**
1. ✅ Architected 6 parallel/sequential sessions (11-week roadmap)
2. ✅ Created implementation plan with full tech stack analysis
3. ✅ Generated prompts library (21 prompts for newsroom)
4. ✅ Planned initial project structure
5. ✅ Decided: Vercel + Strapi + Next.js stack
6. ✅ Created 5 arch decision checklist questions (all answered)
7. ✅ Moved project from `/Projects/mutabe3` → `/Projects/forge/projects/mutabe3`
8. ✅ Started forge structure setup (mutabe3.md, FACTS.md, PLAN.md)

**Result:** 🟢 GREEN  
- Architecture complete and locked
- Prompts ready for newsroom
- Moved to forge governance
- Session 1 (Infrastructure) ready to start this week

**Files created:**
- mutabe3.md (front door)
- FACTS.md (canonical state)
- PLAN.md (decisions, priorities, resume point)
- docs/IMPLEMENTATION_PLAN.md (11-week roadmap)
- docs/PROMPTS_LIBRARY.md (21 prompts)
- .claude/SESSIONS_OVERVIEW.md (6 sessions tracked)
- .claude/sessions/01-infrastructure/ (detailed session 1 docs)

**Next session should:**
1. Complete forge structure (WORKLOG.md, DECISIONS.md, DISPATCH.md, COMMANDS.md)
2. Set up connectors/ (Vercel, GitHub, Sentry)
3. Get Rami approval on forge structure
4. Confirm Session 1 start date
5. Prepare environment setup (Vercel token, Sentry DSN, etc.)

**Blockers:** None (all architecture complete)

---

**Inbox line (when complete):**
```
mutabe3 · forge structure setup · 8/8 docs created · Session 1 ready · needs Rami approval
```

---

