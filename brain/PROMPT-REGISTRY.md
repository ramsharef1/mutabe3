# PROMPT REGISTRY — mutabe3
Status: **proposed** (Track U). The repo has no `.claude/commands` or project skills today — only the 2026-09 `.claude/sessions/*` plan (obsolete) and `docs/PROMPTS_LIBRARY.md` (editorial prompts for journalists). MST-000 and SITE-GEN-000 are not installed. Generating these prompt files is gated: ARCHITECT proposes the diff, Rami approves, then files are written to `brain/prompts/` + `.claude/commands/`.

Naming `<area>-<verb>-<nnn>`. Reports go to `brain/REPORTS.md`; every prompt reads `brain/BIBLE.md` first and writes back to `brain/` last.

| ID | Name | Purpose | Triggers | Reads | Writes | Reports to | Last run |
|---|---|---|---|---|---|---|---|
| meta | `brain-sync` | re-read Bible + repo, reconcile drift, refresh page.json | `/architect sync`, session start | brain/*, repo | brain/page.json, EXECUTION-LOG | REPORTS | — |
| meta | `prompt-relay` | re-tune a prompt for a project outside this scope | `/architect relay` | BIBLE | brain/prompts/ | REPORTS | — |
| meta | `prompt-select` | analyse/edit/merge/archive/run/monitor a prompt | `/architect select` | PROMPT-REGISTRY | PROMPT-REGISTRY | REPORTS | — |
| meta | `prompt-monitor` | compare other prompts' outputs against the Bible | `/architect monitor` | EXECUTION-LOG, artefacts | REPORTS | REPORTS | — |
| meta | `session-inject` | minimal context block to correct a running session | `/architect inject` | BIBLE | — | — | — |
| meta | `reports` | roll up REPORTS into a status line | `/fleet-report`-style | REPORTS | REPORTS | — | — |
| 010 | `news-ship-010` | the shipping pattern: verify locally → push → CI deploy → prod smoke → DECISIONS entry | any feature stage | BIBLE, COMMANDS.md, DECISIONS | DECISIONS, ROADMAP | REPORTS | — |
| 020 | `ops-vps-020` | run/inspect server operations through `ops-vps.yml`; never hand Rami bash blocks | ops need | HOSTING-OPS, COMMANDS.md | DECISIONS | REPORTS | — |
| 030 | `content-launch-030` | weeks 1–2: hide demo blocks, credit field, dateModified, category fix, footer pages (counsel banner), editor speed, Google News readiness | plan v2 | CONTENT-ARCHITECTURE, LEGAL/ | DECISIONS, ROADMAP | REPORTS | — |
| 040 | `rev-ads-040` | weeks 3–4: campaign dates, counts, sponsored kind «إعلان», /advertise + media kit | plan v2 | REVENUE-MAP, PRICING-LAUNCH, ANALYTICS-PLAN | DECISIONS | REPORTS | — |
| 050 | `design-skin-050` | weeks 5–8: Ink & Signal in a worktree, skin toggle, screenshots, sign-off, ship | plan v2 | DESIGN-SYSTEM, tokens.json | tokens.json, DECISIONS | REPORTS | — |
| 060 | `analytics-060` | GA4/GTM/consent, rollups, dashboard | plan v2 | ANALYTICS-PLAN | DECISIONS | REPORTS | — |
| 070 | `sec-fix-070` | S-findings sprint and tracker | plan v2 | SECURITY | SECURITY (status), DECISIONS | REPORTS | — |
| 080 | `legal-pack-080` | draft the 8 documents with counsel banners | plan v2 | LEGAL/README | LEGAL/*.md | REPORTS | — |
| 090 | `client-report-090` | client-safe status summary + monthly report (Track R) | monthly | REPORTS, DECISIONS | brain/CLIENT/ | — | — |
| 100 | `handover-100` | editor manual, SOPs, role matrix, maintenance calendar, runbook (Track S) | before handover | COMMANDS.md, CONTENT-ARCHITECTURE | brain/HANDOVER/ | REPORTS | — |

**Control graph:** ARCHITECT-000 (owns BIBLE) → `news-ship-010` is the execution spine every feature prompt (030–080) hands off to → `ops-vps-020` serves 010 and 070 → `client-report-090` and `handover-100` read REPORTS/DECISIONS only. MST-000 / SITE-GEN-000: offer a light install after the first sale if the prompt count grows.

**Protected page:** admin-only dashboard route `/dashboard/brain` rendering `brain/page.json` (Bible excerpt, decisions tail, open questions, findings status, prompt registry, execution log) — host-level auth is the existing staff login; the static `brain/index.html` template is not used in a Next app.
