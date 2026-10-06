# DESIGN-SYSTEM — المتابع · Direction A «حبر وإشارة» (Ink & Signal)
Status: approved direction (D-050); **tokens are proposed until worktree screenshots on real content are signed off by the client** (weeks 5–8). Structure, densities and measurements of the Ammon replica stay frozen (D-034); only colour, type and components change. Source of truth for values: `tokens.json`.

## Brand facts (measured, not invented)
- Logo band (microphone medallion): **`#2E6DB4`** — `packages/frontend/public/logo.svg` line 12; same hex in `logo-white.svg`, the lockup and `app/icon.svg`. Logo ink `#111111` (treated as one with token ink `#0B0B0F`, 1.04:1 apart). Lockup tagline `#8A8A8A`. **The logo contains no red** — every red on the site (`#990000`, `#a80101`, `#c00`/`#c41e3a`, `#e00000`, `#c62828`, ~218 CSS lines) is Ammon legacy.
- Fonts actually loaded: Noto Kufi Arabic 700 (arabic subset only), Noto Naskh Arabic, Amiri (article route). Measured values differ from the brief: nav is 14px, article body was Amiri **bold** 20/35, page body falls back to Arial/Tahoma.

## Decisions
- **Palette:** ink `#0B0B0F` · paper `#FFFFFF` / `#F5F6F8` / `#ECEEF1` · accent `#2E6DB4` (as text use `accentText` `#1F5496` light / `#5B94DE` dark — the raw accent fails as text on dark `#141414` at 3.48:1 and on the ink bar at 3.71:1) · muted `#5B6472` · **red only as `live` `#D7262D`** (عاجل/live badges; white text 4.99:1 — do not lighten) · distinct `error` `#B42318` for market ▼, fact-check «خاطئ», form errors · `warning` `#B45309` · `success` `#15803D`.
- **Type (owner decision 4.4):** **Noto Kufi Arabic** for headlines/UI, **Noto Naskh Arabic** for body, summaries, captions and the article body — **Amiri dropped** (two families, ≤3 font files first view). Add the `latin` subset so Western digits use brand fonts; `tabular-nums` for markets/prayer times. Article body starting point Naskh 400 at 17–18px/1.85 desktop, 16–17 mobile — **measure in the worktree**; list titles ≤13px: decide Kufi vs Naskh 700 from the clamp tests.
- **Dark mode:** use `logo-white.svg` via two `<img>` toggled by `[data-theme]`; drop the CSS `filter` on the logo (`globals.css:550`). Images keep `brightness(.9)` except ads/lightbox.
- **Admin:** neutral ink + accent only for primary action, focus ring and active nav; no red.

## Logo ↔ palette ↔ UI fit test
| Case | Result | Action |
|---|---|---|
| White | pass (ink 18.9:1, band 5.30:1) | — |
| `#F5F6F8` | pass | — |
| Dark `#141414` | **fail** with `logo.svg` (1.0:1); the filter paints the band ~`#6EB3FF` | use `logo-white.svg`, no filter |
| Footer `#1E1E1E` | pass (band 3.15:1 non-text) | — |
| Favicon 16/32 | partial — pin tip lost, ink vanishes on dark tab strips | white plate + heavier ring ≤32px |
| `apple-icon.png` | alpha unverified (iOS paints transparency black) | flatten on white |
| Maskable 512 | pass | — |
| OG 1200×630 | **fail** — red bar/rule and tagline baked in | regenerate (asset 1) |
| Lockup tagline `#8A8A8A` | 3.45:1, fails small | lockup v2 with `#5B6472` |

## Red migration (globals.css / page.tsx / util.ts)
| Where | Today → new | Flag |
|---|---|---|
| `.topmenu`, `.pill.audio`, `.tsq` | red → ink bar, `onInk` text, 16% white rules | — |
| rules `.nav`/`.writers`/`.main` | `#a80101` → ink 1px; `.main` 2px accent | — |
| nav hover/active, sticky | red → `accentText` + underline | hover vs ink text only 2.6:1 → underline required |
| section headers `.sec .hd`, `.cathd`, `.gal-hd`, `.box .hd`, `.disc .hd`, `.sidebox` | red tab → ink tab, white text, 2px accent base | gold header fails 2.85:1 → ink tab + gold rule; drop `.eco`/`.season` hues |
| `.chip`, `catColor()` (`util.ts:83–95`) | red/rainbow → ink | ink-only chips |
| `.arr li:before`, `.rank`, `.picks`, `.trend` | red → accent; top-3 ink | — |
| links/hover, `.artbody a`, `.aubox a`, `.also b` | red → `accentText` | — |
| buttons/active states | red (hover `#700`/`#b00`) → accent, hover `accentHover` | — |
| quote rails/tints (`.artsum`, `.pull`, blockquote, `.cathead`, `.tl`, `.util`) | red → 3–4px accent rail, `accentSoft` | — |
| video/player (`.cap`, `.th.on`, `.pl2`, `.mini`, `.progress`, `.lb-x`) | red → accent; play → ink/white | not live → no red |
| footer top 4px, `.ficon i`, `.fcols b` | red → accent | — |
| `.news-cta` gradient | → `accentHover→ink`; button text `accentText` | — |
| **keep red = `live`**: `.live`, `.chip.islive`, `.brk`, `.ticker.hot`, `.livestrip .badge`, `.lblog` | `#e00000` → `#D7262D`; `.livestrip` rail/`.follow` → accent | — |
| error/down/false (`.dot.bad`, `.market-down`, `.vote .n`, fact-check) | → `error` | news convention needs a negative colour |
| `layout.tsx:38`, `manifest.ts:18`, print `#900`, `email.ts:154`, `.adm-*` | → ink/accent | admin stays neutral |
Known contrast failures to retire while migrating: white on `#10b981` (2.54), `#f59e0b` text (2.15), white on gold header (2.85), `#999` text (2.85).

## Component enrichment (indicative — measure before copying)
| Source | Idea | Goes to |
|---|---|---|
| [aawsat.com](https://aawsat.com/) | small circular portrait above the headline, almost no accent | كتاب المتابع band (`.writers.desk`, `.rail .w`), 56px circles, ink names |
| [aljazeera.net](https://www.aljazeera.net/) | عاجل strip as the only red; blue badge for live; trending-topics row | `.brk`/`.ticker.hot` keep red; `.livestrip` → accent pill; `.topics` → ink pills |
| [alghad.com](https://alghad.com/) | dark section bars with white text (local market) | `.sec .hd b` ink tab |
| [khaberni.com](https://www.khaberni.com/) | white/dark chrome, عاجل as the single interruption | `.brk` placement, section base rule |
| [BBC Arabic type notes](https://rosettatype.com/articles/2011-04-02-bbc-arabic) | screen-hinted Arabic | test Noto on low-DPI Windows; `latin` subset |
| [Google colour-contrast codelab](https://codelabs.developers.google.com/color-contrast-accessibility) | dark theme = lighter tone of the same hue | `accentText` dark `#5B94DE`; CI script recomputing token pairs |

## Assets to produce (original only)
| Asset | Spec | Tokens |
|---|---|---|
| OG/Twitter 1200×630 | rendered by headless Chromium (Satori lacks full bidi): ink bg, Kufi 700 56/1.35 headline, `logo-white`, 8px accent rule, no tagline | ink, onInk, accent |
| Favicon set | `.ico` 16/32/48 with plate, `icon.svg`, apple 180 flattened, 192/512 + maskable, themeColor ink | ink, accent, bg |
| Email shell | 600px table, PNG@2x logo, 3px accent rule, accent button, ink footer, Tahoma/Arial stack | accent, ink, onInkMuted |
| Dashboard | neutral; accent for primary/focus/active | neutral, accent, semantic |
| Social kit | avatar 1080², story 1080×1920, X header 1500×500, YouTube 2560×1440 | ink, bg, accent |
| Media-kit cover | 16:9 + A4, ink bg, `logo-white`, real figures only | ink, accentSoft, bg2 |
Replace `face()` placeholder portraits (pravatar.cc) with real photos or `.au-init` monograms — placeholders are not original assets.

## Rollout & risks
1. **The client reads red as "Ammon".** Ship under `:root[data-skin=ink]` from a worktree build; before/after screenshots at 1002px (home, article, category), 390px mobile, dark; the red skin stays one attribute away until sign-off.
2. **Contrast/density regressions.** `accentText` + CI contrast script; Kufi may be wider than Arial/Tahoma — measure the 13-item nav and 2-line card clamps on real articles.
