# MARKET — Jordanian news comparables (Track C, 2026-10-06)
Method: homepages + about/ads pages fetched as text (palette, density and mobile approach are **unverified** — no DOM measurement). royanews.tv returned a stub; alrai.com and alarabiya.net returned 403, so those rows rely on app-store and search snippets. Traffic figures are third-party estimates — directional only.

## Competitors
| Outlet | Positioning · visible revenue | Stack · engagement | Weakness we exploit |
|---|---|---|---|
| [Ammon](https://www.ammonnews.net) (our structural model) | First Jordanian online paper (2006), AR+EN ([Wikipedia](https://en.wikipedia.org/wiki/Ammon_News)); DoubleClick, Taboola, Outbrain domains reported; no advertise link | CMS unverified; apps; obituaries, tenders, jobs | [About](https://www.ammonnews.net/pages/about_us) names no editor, licence or ad contact; recommendation-widget clutter |
| [Khaberni](https://www.khaberni.com) | Direct banners (Zain, Orange…); [ad page](https://www.khaberni.com/page/ad-with-us) sells banners, sponsored articles, video, pop-ups — no rates | TurnPoint CMS; Telegram, Nabd; [corrections policy](https://www.khaberni.com/page/error-correction-policy); new app (2025) | Pop-ups; sponsored content described as blending "naturally" with news — no disclosure standard; no newsletter |
| [Saraya](https://www.sarayanews.com) | Agency since 2007 ([about](https://www.sarayanews.com/pages/about_us)); [ads](https://www.sarayanews.com/pages/adv) = phone/email only | Built by Loddi; 8 social platforms; most-read/trending; podcasts; obituaries, jobs | Dream-interpretation filler; no named editor or licence |
| [Roya](https://royanews.tv) | TV-backed ([Wikipedia](https://en.wikipedia.org/wiki/Roya_TV)); ~#2 Jordan news by search traffic ([Ahrefs mirror, directional](https://ahrefstop.com/websites/jordan/news)) | [iOS app](https://apps.apple.com/us/app/-/id1146252812) 3.2/5 — reviews cite autoplay ads and loud notifications | site unverified |
| [Al-Ghad](https://alghad.com) | Newspaper; [ads](https://alghad.com/اعلن-معنا): email/phone, print+web, no rates | Smartly CMS; **only outlet with a newsletter box**; prayer times, weather, e-paper, podcasts | no named editor/licence in footer |
| [Jo24](https://jo24.net) | "Independent"; local-brand banners; no advertise link | dark/light toggle, RSS, Spotify, Telegram; ethics charter + editorial policy | no ad channel, no newsletter |
| Al-Rai | State-owned daily since 1971 ([Wikipedia](https://en.wikipedia.org/wiki/Al_Ra%27i_(Jordanian_newspaper))) | 403 — unverified | — |
| Al Arabiya (regional reference) | Ad sales via MBC Media Solutions ([source](https://communicateonline.me/news/al-arabiya-news-network-mbc-media-solution-mms-launch-akthar/)) | app 4.4/5, 1M+ downloads; reviews cite duplicate pushes | 403 — design unverified |

## Gap map
| Class | Item | Evidence |
|---|---|---|
| Table stakes | About, Team (named editor), Contact, Privacy, Corrections pages | Khaberni, Jo24, Saraya |
| Table stakes | Advertise page with a named contact | Khaberni, Saraya, Al-Ghad |
| Table stakes | Telegram, WhatsApp, Nabd distribution | Khaberni, Jo24, Saraya |
| Table stakes | Most-read; obituaries/jobs sections | Saraya, Ammon |
| Opportunity | Public rate card + media kit | none publishes one |
| Opportunity | Visible «إعلان» labels on sponsored content | none seen |
| Opportunity | Newsletter | only Al-Ghad |
| Opportunity | A good PWA/app | Roya's app weak; Khaberni's new/unrated |
| Avoid | Pop-ups, autoplay | Khaberni, Roya reviews |
| Avoid | Recommendation widgets | Ammon |
| Avoid | Filler (dream interpretation, advice) | Saraya |

## Imprint & law notes
Khaberni's team page names an editor-in-chief; Jo24 names its editor-in-chief; no «المدير المسؤول» or licence number found on any fetched page. Licensing by the Media Commission and a JPA-member editor-in-chief are required; sites have been blocked without a court order ([RSF](https://rsf.org/en/news/jordan-blocks-access-nine-more-news-websites); [CPJ 2025](https://cpj.org/2025/05/jordan-bans-12-news-sites-for-spreading-media-poison-following-corruption-report/)). **Review by counsel.**

## Recommendations (by impact)
1. Real About/Team/Corrections/Privacy/Advertise pages with the named responsible editor — before any launch push.
2. Media kit + the «إعلان» label standard (none of the competitors do either).
3. Fix the mobile viewport overflow noted in D-043 Stage 5 before driving traffic (verify whether 33845ac closed it).
4. Open Telegram/WhatsApp/Nabd channels; Google News works from the existing news sitemap.
5. Fix SPF/DKIM, then run the daily newsletter — only Al-Ghad competes there.
