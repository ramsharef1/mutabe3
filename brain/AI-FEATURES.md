# AI-FEATURES — mutabe3
Status: **deferred past 90 days** (owner, 2026-10-06: editor speed comes from faster UX + templates per kind, not AI). Kept as the evaluated option set; re-open if the desk cannot sustain 10+ articles/day.

| Feature | Model | Phase | Notes |
|---|---|---|---|
| Editor assist — 3 headline options, summary, SEO description, tag/category suggestion from the existing list, Arabic proofreading as suggestions | claude-sonnet-5-5 (claude-fable-5-1 for quality where it matters) | first, when re-opened | never auto-applies; publishing never blocked; off by default per instance |
| Comment triage — spam/abuse/defamation flag, sort only | claude-sonnet-5-5 (Haiku 4.5 may be retired from 2026-10-15) | second | sends text + name, never email or IP |
| Related / semantic search | — | later | embeddings need pgvector + a provider; tags + pg_trgm suffice now |
| Translation for the English edition | claude-sonnet-5-5, Batch (−50%) | with the English edition | human review mandatory |

**Data flow:** dashboard → `/api/admin/ai/*` (staff only) → Anthropic API (key in the instance env). **Privacy:** drafts leave the server → the client must consent explicitly; API data is not used for training (verify current retention terms before relying on them). **Cost ceiling:** `AiUsage` ledger from response `usage`; refuse at `AI_MONTHLY_BUDGET_USD`; per-user daily cap. **Fallback:** hide the buttons, manual work. **Evaluation:** log accepted/edited/ignored suggestions; a 30-article golden set before any prompt or model change. Pricing reference per million tokens (in/out): Fable 5.1 $10/$50, Sonnet 5.5 $2/$10, Haiku 4.5 $1/$5 ([models](https://platform.claude.com/docs/en/docs/about-claude/models/overview)).

**Not AI, but the editor-speed levers approved for weeks 1–2:** templates per article kind (breaking, report, statement, explainer, column), keyboard save/publish, duplicate article, quick credit/caption fields, remembered category; paste-cleaning already exists.
