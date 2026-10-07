# CONTENT-ARCHITECTURE — mutabe3
Status: approved with plan v2 (D-050). Lengths are house defaults — Google sets none ([title links](https://developers.google.com/search/docs/appearance/title-link), [snippets](https://developers.google.com/search/docs/appearance/snippet)). Owner decisions: editors write in the dashboard (no import/feed), target 10+ articles/day, demo articles stay until real content exists, editor speed via faster UX + templates per kind.

## 0. Launch-integrity issues (fix in weeks 1–2)
1. Footer links are `#` — about, contact, privacy… do not exist (`components/site.tsx:244`).
2. ~20 homepage blocks show invented "live" data (`feeds.ts` says demo); live strip (`LIVE['art-006']`), video (7 hardcoded ids), columnists (`WRITERS` list), demo debate personas → **hide** until real sources exist.
3. Category pages repeat articles and inflate counts; thin/unknown slugs show other categories' stories (`category/[slug]/page.tsx:22-26,82-83,95`) → real pagination, 404 on unknown slugs.
4. Every cover captioned «تصوير: المتابع» (`ArticleView.tsx:122`) → **credit + caption fields**.
5. `dateModified` comes from `updatedAt`, bumped by every view-count increment (`index.ts:143`, `schema.prisma:122`) → **editorial `editedAt`** only ([Google on dates](https://developers.google.com/search/docs/appearance/publication-dates)).
Also: category/tag/search pages are client-rendered without own title/canonical; tags come from a 38-word hardcoded list (`content.ts:5-9`); placeholder portraits from pravatar.cc → monogram avatars.

## 1. Content types and per-type rules
| Type | Status | Template · required fields | SEO · schema | Links · CTA · freshness · EN |
|---|---|---|---|---|
| News article | exists, thin | title, summary, body, category, author; **add** slug, cover credit + caption, `kind`, `editedAt` | NewsArticle + Breadcrumb ([docs](https://developers.google.com/search/docs/appearance/structured-data/article)); add `author.url`; headline ≤90, description 120–160; images 16:9/4:3/1:1 | ≥2 related by tag; CTA newsletter; `dateModified` only on editorial edits; EN via `translationOf` later |
| Category / section | exists, client-rendered | name, intro, (child sections later) | server-rendered, own title/description, CollectionPage; `?page=N` self-canonical; unknown slug = 404 | links to hubs; advertise slot; hubs reviewed quarterly |
| Tag / topic | partial (hardcoded) | Tag model: name, slug, description | CollectionPage; noindex under 3 articles | from article + category |
| Columnist + author page | **live (D-067)** — opt-in profile (job title + published piece); illustrative WRITERS only while none exists and the demo switch is on | slug, photo (real or monogram), bio, role; `kind=OPINION` labelled «رأي» | ProfilePage + Person ([docs](https://developers.google.com/search/docs/appearance/structured-data/profile-page)) | CTA follow/newsletter; list by date; **hide كتاب المتابع until real columnists exist** |
| Video | **live (D-068)** — VIDEO articles with an embedded YouTube video feed «فيديو المتابع»; VideoObject | YouTube id, title, description, duration, thumbnail | VideoObject ([docs](https://developers.google.com/search/docs/appearance/structured-data/video)) | embedded in related articles |
| Caricature | **live (D-068)** — CARICATURE articles, drawing as the cover image shown uncropped; homepage block | WebP image, artist, alt | ImageObject | archive by artist |
| Photo gallery | partial (placeholders) | images with credit + caption | Article + image sitemap | — |
| Live blog | **live (D-068)** — LiveEntry updates, editor panel, auto-refresh, end/reopen; LiveBlogPosting | entries (time, text, key flag), start/end | LiveBlogPosting | close with a summary |
| Poll / debate | exists | replace demo personas | not indexed | — |
| Newsletter issue | exists | — | optional public archive | CTA surface |
| **Sponsored article** | missing → weeks 3–4 | sponsor, `kind=SPONSORED`, label «إعلان» on card + «محتوى مدفوع من ‹الجهة›» on page, `rel=sponsored` links | NewsArticle; **excluded** from news sitemap, RSS, lead/breaking/picks, most-read | — |
| Static / legal (9) | missing → weeks 1–2 drafts | about, contact, advertise + media kit, privacy, terms, cookies, corrections + right of reply, editorial policy, imprint (licence holder + responsible editor, names only) | AboutPage / ContactPage | footer-linked; **review by counsel** |
| Data blocks (roads, crossings, MP votes, obits, jobs, FX, league, fact-check) | demo | each needs a source + timestamp, or is hidden; paid greetings dropped | fact-check editorial only ([ClaimReview rich results retired 2025-06](https://developers.google.com/search/blog/2025/06/simplifying-search-results)) | — |
Locale parity (all types): locale field, per-locale slug, hreflang only when a translation exists, `x-default=ar`, shared images and credits.

**Article kinds (one enum + small JSON `extra`):** NEWS, OPINION, EXPLAINER, SPONSORED, LIVE, VIDEO, GALLERY, CARICATURE, NOTICE (paid notices pilot). Templates per kind (owner lever): breaking, report, statement, explainer, column — pre-filled structure, remembered category, keyboard save/publish, duplicate article, quick credit/caption.

## 2. URLs
Slug = Arabic words with hyphens, ≤8 words, + short unique suffix; frozen after publishing, 301 on change. `/article/<id>` (and `art-001`) 301 → slug. Categories keep Latin slugs. Google: readable words, percent-encoded non-ASCII, hyphens ([URL structure](https://developers.google.com/search/docs/crawling-indexing/url-structure)); trade-off: Arabic percent-encoding makes copied links long.

## 3. Topical map (L1 / L2 › L3 / evergreen hubs)
| Category | L2 › L3 | Hubs |
|---|---|---|
| اخبار الاردن | حكومة › مجلس الوزراء، قرارات · أمن › أمن عام، دفاع مدني · محافظات › عمّان، إربد، الزرقاء، العقبة · خدمات › مياه، كهرباء، نقل | دليل الخدمات الحكومية · الإدارة المحلية والبلديات · الطوارئ |
| شرق وغرب | scope to confirm with the desk | — |
| اقتصاد | طاقة · عقار · بورصة عمّان · ضرائب ورسوم · عمل وضمان · بنوك | دليل الضرائب والرسوم · تسعير الكهرباء والوقود · الاستثمار والترخيص |
| تعليم و جامعات | توجيهي · جامعات · مدارس · تدريب مهني › القبول الموحد، التخصصات | دليل القبول الموحد · التخصصات وسوق العمل · المنح |
| العالم | عربي · دولي · اقتصاد عالمي | خلفيات الملفات · المنظمات الدولية |
| فلسطين | غزة · الضفة · القدس والمقدسات · العلاقة الأردنية | خلفية وجدول زمني · المقدسات |
| البرلمان | النواب · الأعيان · لجان وتشريعات · أحزاب وانتخاب | من مشروع إلى قانون · قانون الانتخاب والأحزاب · سجل تصويت النواب (sourced only) |
| بانوراما | مجتمع · ثقافة وفنون · سياحة وتراث | دليل الوجهات · ذاكرة الأردن |
| كتاب المتابع | by columnist | سياسة الرأي والكتّاب |
| ليالي المتابع | scope to confirm with the desk | — |
| صحة وبيئة | صحة عامة · مستشفيات وتأمين · مياه · مناخ | التأمين الصحي · ملف المياه · الإسعاف والطوارئ |
| كاريكاتير | by artist, by topic | — |
| فيديو | تقارير · مقابلات · مباشر | playlists per category |
رياضة stays hidden until a sports desk exists.

## 4. Google News / Discover checklist (Arabic)
Done: news sitemap (48h, `ar` — [spec](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap)), NewsArticle + Breadcrumb, `max-image-preview:large`, `lang=ar dir=rtl`, `rel=sponsored` on banners. To do: Search Console domain property + Publisher Center ([verify first](https://support.google.com/news/publisher-center/answer/9548309); [inclusion is automatic](https://developers.google.com/search/blog/2019/01/ways-to-succeed-in-google-news)); `author.url`; sponsored flag → exclusions; absolute Amman-time date on page; covers ≥1200px wide 16:9 enforced in the editor ([Discover](https://developers.google.com/search/docs/appearance/google-discover)); transparency pages ([News policies](https://support.google.com/news/publisher-center/answer/6204050)); `dateModified` only on edits; hreflang for EN later.

## 5. Editorial workflow (1–3 editors, 10+/day)
- **Roles:** JOURNALIST = writer (drafts only) · EDITOR = desk (publish, schedule, homepage, comments) · ADMIN = ops. The **responsible editor is a named person**, not a shared account.
- **Cadence:** morning brief (feeds the digest hour), midday update, evening wrap, overnight scheduled posts; hours set by the desk.
- **Corrections:** visible «تم التصحيح» note with date; substantive edits set `editedAt`; right-of-reply via the corrections page. Needs a correction field + audit log (neither exists).
- **Sourcing:** attribute every claim; two sources for contested claims; no unverified social screenshots.
- **Images:** own, licensed agency, official handouts (check terms), CC BY/BY-SA with credit (no NC), reader submissions with written consent; never Google Images or social media; label AI images; credit from the field.
- **Demo articles:** stay public until real content exists (owner decision 7.3); then archive (public 404, out of sitemaps) → delete after a backup cycle → clear `PICKS`, `LIVE`, `MATCH`, demo debate → Search Console removals if indexed. **Separate gate.**

## 6. Style sheet (outline)
Jordanian MSA, short sentences, dialect only in verbatim quotes · one headline pattern, no clickbait · attribution verbs · Western digits (confirm) · Gregorian + Hijri dates, Asia/Amman, absolute on page · hamza and ta-marbuta consistent in copy (search already normalises variants); keep registered brand spellings («الاخباري») · punctuation «» ، ؟ ؛ · names/titles · currency and percentages · sponsored and correction wording · tashkeel only to disambiguate.

## Open (desk)
Photo sources (own photographer / agency licence?) · real columnists at launch? · meaning of «شرق وغرب» and «ليالي المتابع» · Search Console access and whether demo URLs are indexed · Western digits confirmed?
