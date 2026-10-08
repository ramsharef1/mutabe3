// Server component (B9): articles + weather are fetched on the server and revalidated; interactive blocks are client islands.
import { Img, SiteHeader, SiteFooter, SecHd, More, AdBanner, AdBox, Chip } from './components/site';
import { Article, WRITERS, face, ago, readMins, excerpt, youTubeId } from './components/util';
import { VideoSection } from './components/video';
import { UtilityStrip, MetAlert } from './components/blocks/utility';
import { BreakingBar, Ticker, MarketStrip, Missed, LatestBox, PicksBox, ObitsBox, MostRead, Sixty, Carousel, Debate, WritersRail } from './components/blocks/fold';
import { Crossings, Roads, Services, Royal, Decisions, VoteTracker, TaxCalc, CustomsCalc, ElecCalc, AdmissionCalc, Seasonal, Sports, Diaspora, Ugc, Greetings, Memory, Capture, FactCheck, Jobs, Timeline, AudioPill } from './components/blocks/jordan';
import { PremiumSpotlight } from './components/blocks/premium';
import { TrendingNow } from './components/blocks/trending';
import { TrendingTopics } from './components/blocks/topics';
import { CardShare } from './components/blocks/share';
import { ForYou } from './components/blocks/foryou';
import { LiveStrip } from './components/blocks/livestrip';
import { CommunityBand } from './components/blocks/community';
import { NewsletterCTA } from './components/blocks/newsletter';
import { MostDiscussed } from './components/blocks/discussed';
import { Pool, prayerTimes, fetchWeather, hijri, ammanDate, ammanTime, currentSeason, wxText, BreakingItem } from './components/feeds';
import JsonLd from './components/JsonLd';
import { websiteLd } from './lib/seo';
import { fetchAuthors, fetchArticles, fetchCurrentLive } from './lib/api';
import { fetchData, type Block } from './lib/data';
import { CaricatureBand } from './components/blocks/caricature';
import { WritersBand } from './components/authors';

export const revalidate = 60;

const API = process.env.VPS_API || 'http://127.0.0.1:9080';
// Sections with their own homepage box (D-082) — fetched one list each so a box never shows another section.
const SECTION_SLUGS = ['politics', 'economy', 'palestine', 'world', 'east-west', 'education', 'parliament', 'nights', 'video', 'caricature', 'health', 'panorama', 'writers'];

async function getArticles(): Promise<Article[]> {
  try {
    const r = await fetch(`${API}/api/articles`, { next: { revalidate: 60 } });
    if (!r.ok) return [];
    const j = await r.json();
    return j.data || [];
  } catch {
    return [];
  }
}

// Editor curation from /dashboard/homepage (D-043 Stage 3). Saving there revalidates '/'.
// demoBlocks: the illustrative data blocks stay on until an editor switches them off (BIBLE F-02 / D-052).
interface Curated { hero: Article | null; picks: Article[]; breaking: BreakingItem | null; demoBlocks: boolean }
async function getCuration(): Promise<Curated> {
  try {
    const r = await fetch(`${API}/api/homepage`, { next: { revalidate: 60 } });
    if (!r.ok) throw new Error(String(r.status));
    const d = (await r.json()).data || {};
    return { hero: d.hero || null, picks: d.picks || [], breaking: d.breaking || null, demoBlocks: d.demoBlocks !== false };
  } catch {
    return { hero: null, picks: [], breaking: null, demoBlocks: true };
  }
}

const link = (a: Article) => `/article/${a.id}`;

const Cards = ({ items, five = false }: { items: Article[]; five?: boolean }) => (
  <div className={`cards ${five ? 'cards5' : ''}`}>
    {items.map((a) => (
      <div key={a.id} className="cardwrap">
        <a className="card" href={link(a)}>
          <div className="im"><Img src={a.featuredImageUrl} /><Chip a={a} /></div>
          <div className="t">{a.title}</div>
          <span className="tm">{ago(a.publishedAt)} · <span className="readtime">⏱ {readMins(a.content)} دقايق</span></span>
        </a>
        <CardShare a={a} />
      </div>
    ))}
  </div>
);
const Smalls = ({ items, cols = 4 }: { items: Article[]; cols?: number }) => (
  <div className={`smalls ${cols === 1 ? 'smalls1' : cols === 3 ? 'smalls3' : ''}`}>
    {items.map((a) => (
      <a key={a.id} className="sm" href={link(a)}>
        <div className="th"><Img src={a.featuredImageUrl} /></div>
        <div className="t">{a.title}<span className="tm">{ago(a.publishedAt)} · <span className="readtime">⏱ {readMins(a.content)}</span></span></div>
      </a>
    ))}
  </div>
);
const Grid3 = ({ items }: { items: Article[] }) => (
  <div className="grid3">
    {items.map((a) => (
      <a key={a.id} className="card" href={link(a)}>
        <div className="im"><Img src={a.featuredImageUrl} /><Chip a={a} /></div>
        <div className="t">{a.title}</div>
      </a>
    ))}
  </div>
);
const Bullets = ({ items }: { items: Article[] }) => (
  <ul className="arr">{items.map((a) => <li key={a.id}><a href={link(a)}>{a.title}</a></li>)}</ul>
);
const BigText = ({ a, more }: { a: Article; more: Article[] }) => (
  <>
    <div className="bigtext">
      <a className="im" href={link(a)}><Img src={a.featuredImageUrl} /><Chip a={a} /></a>
      <div><a className="t" href={link(a)}>{a.title}</a><p>{excerpt(a, 220)}</p></div>
    </div>
    <div style={{ marginTop: 6 }}><Bullets items={more} /></div>
  </>
);

export default async function Home(props: { searchParams?: Promise<{ season?: string }> }) {
  const searchParams = await props.searchParams;
  const [latestArticles, wx, curated, writers, videoArts, caricatureArts, liveNowItem, data, bySection] = await Promise.all([
    getArticles(), fetchWeather(), getCuration(), fetchAuthors('OPINION'),
    fetchArticles({ kind: 'VIDEO', take: '7' }, 60), fetchArticles({ kind: 'CARICATURE', take: '4' }, 60), fetchCurrentLive(), fetchData(),
    // Each section box shows its own section (D-082): one cached list per section, newest first.
    Promise.all(SECTION_SLUGS.map((slug) => fetchArticles({ category: slug, take: '12' }, 60))).then((ls) => new Map(SECTION_SLUGS.map((slug, i) => [slug, ls[i]]))),
  ]);
  // Desk-managed data blocks (D-076): a block shows the desk's rows while fresh, the illustrative version only
  // while the demo switch is on, otherwise nothing. `upd` is the honest «تحديث» line for a real block.
  const upd = (b?: Block) => (b ? `تحديث ${ago(b.updatedAt)}` : undefined);
  const fxDay = data.fx ? new Intl.DateTimeFormat('ar-JO-u-nu-latn', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${data.fx.day}T00:00:00Z`)) : '';
  // Real video pieces: the first YouTube embed in each VIDEO article's body (D-068). The kind is checked here
  // too: during a deploy the old API ignored ?kind= and its answer stayed in the 60 s cache (seen 2026-10-08).
  const videos = videoArts.filter((a) => a.kind === 'VIDEO').flatMap((a) => { const id = youTubeId(a.content); return id ? [{ id, title: a.title, href: `/article/${encodeURIComponent(a.slug || a.id)}` }] : []; });
  const caricatures = caricatureArts.filter((a) => a.kind === 'CARICATURE');
  // A curated lead story goes first (and is removed from its newest-first slot) so the pool hands it to the hero.
  const articles = curated.hero ? [curated.hero, ...latestArticles.filter((a) => a.id !== curated.hero!.id)] : latestArticles;
  if (!articles.length) {
    return <div className="am"><SiteHeader /><div className="wrap loading">لا تتوفر أخبار حالياً — حاول بعد قليل.</div><SiteFooter /></div>;
  }
  const now = new Date();
  const prayers = prayerTimes(now);
  const season = searchParams?.season === 'all' ? 'all' : currentSeason(now);
  const amman = wx[0];
  const demo = curated.demoBlocks; // illustrative data blocks — off from /dashboard/homepage once real content exists (F-02)

  // B1: every block draws from an exclusive pool so the fold never repeats a story.
  // Paid material (kind SPONSORED) stays out of the hero, lead list and ticker; it appears lower down, labelled «إعلان» (D-057).
  const newsOnly = articles.filter((a) => a.kind !== 'SPONSORED');
  const pool = new Pool([...newsOnly, ...articles.filter((a) => a.kind === 'SPONSORED')]);
  const hero = pool.take(1)[0];
  const leadMore = pool.take(3);
  const mid = pool.take(11);
  const latest = pool.take(6);
  const premium = pool.take(3);
  const trending = pool.take(5);
  pool.take(6); // formerly "discussed"; still consumed so the sections below keep their picks
  // D-082: section boxes take from their own section — first pieces the fold above does not show, then its own
  // pieces the fold does show (a box repeating its section beats an empty box), news before labelled paid pieces;
  // no box repeats another box, and only a section with too few pieces is topped up from the shared pool.
  const fold = new Set([hero, ...leadMore, ...mid, ...latest, ...premium, ...trending].filter(Boolean).map((a) => a.id));
  const inBox = new Set<string>();
  const sec = (slug: string, n: number): Article[] => {
    const own = (bySection.get(slug) || []).filter((a) => !inBox.has(a.id));
    const rank = (a: Article) => (fold.has(a.id) ? 2 : 0) + (a.kind === 'SPONSORED' ? 1 : 0);
    const out = own.map((a, i) => ({ a, i })).sort((x, y) => rank(x.a) - rank(y.a) || x.i - y.i).map((x) => x.a).slice(0, n);
    for (let tries = 0; out.length < n && tries < articles.length; tries++) { const x = pool.take(1)[0]; if (x && !inBox.has(x.id) && !out.includes(x)) out.push(x); }
    out.forEach((a) => inBox.add(a.id));
    return out;
  };
  const jordanAll = sec('politics', 8), jordan = jordanAll.slice(0, 4), jordanS = jordanAll.slice(4);
  const econAll = sec('economy', 9), econ = econAll.slice(0, 5), econS = econAll.slice(5);
  const pal = sec('palestine', 3), world = sec('world', 4);
  const eastAll = sec('east-west', 8), east = eastAll.slice(0, 4), eastS = eastAll.slice(4);
  const edu = sec('education', 4), parl = sec('parliament', 3);
  const nights = sec('nights', 7);
  const vids = sec('video', 4), cartoons = sec('caricature', 4), health = sec('health', 4);
  const pano = sec('panorama', 7);
  const writerPieces = sec('writers', 4);
  const ticker = [hero, ...mid.slice(0, 5)];

  return (
    <div className="am home">
      <JsonLd data={websiteLd()} />
      <SiteHeader articles={articles} temp={amman?.t} wxLabel={amman ? wxText(amman.code) : undefined} />
      {/* the page's one heading for screen readers and search engines; the masthead logo is the visual title */}
      <h1 className="sr-only">موقع المتابع الاخباري — آخر أخبار الأردن وفلسطين والعالم</h1>

      <div className="wrap">
        <UtilityStrip prayers={prayers} wx={wx} hijriText={hijri(now)} dateText={ammanDate(now)} />

        <BreakingBar item={curated.breaking} />
        {(data.alert || demo) && <MetAlert item={data.alert?.items[0]} />}
        <Ticker items={ticker} hot={!!curated.breaking} />
        {/* running coverage (D-068) wins; the seeded demo story only while the demo switch is on */}
        {liveNowItem ? <LiveStrip current={liveNowItem} /> : demo && <LiveStrip />}
        {(data.fx || data.market || demo) && <MarketStrip updated={data.fx || data.market ? fxDay || (upd(data.market) ?? '') : ammanTime(now)} fx={data.fx} rows={data.market?.items} />}
        <Missed articles={articles} />

        {/* Premium Spotlight */}
        <PremiumSpotlight items={premium} />

        {/* Trending Topics — curated subject discovery from real tags */}
        <TrendingTopics articles={articles} />

        {/* Fold */}
        <div className="main">
          <div className="lead">
            <a className="hero" href={link(hero)}>
              <div className="img"><Img src={hero.featuredImageUrl} priority /></div>
              <div className="cap"><Chip a={hero} /><h2>{hero.title}</h2><span className="tm">{ago(hero.publishedAt)}</span></div>
            </a>
            <ul className="leadmore">
              {leadMore.map((a) => (
                <li key={a.id}><a href={link(a)}><span className="t">{a.title}</span><span className="tm">{ago(a.publishedAt)}</span></a></li>
              ))}
            </ul>
          </div>
          <div className="mid">
            {mid.map((a) => (
              <a key={a.id} className="item" href={link(a)}>
                <div className="th"><Img src={a.featuredImageUrl} /></div>
                <div className="t">{a.title}<span className="tm">{ago(a.publishedAt)}</span></div>
              </a>
            ))}
          </div>
          <div className="side">
            <div className="desk sidead"><AdBox variant={5} /></div>
            <div className="desk"><NewsletterCTA /></div>
            <LatestBox items={latest} />
          </div>
        </div>

        {/* Picks + Obituaries below the fold (desktop) so the sidebar height matches the main column */}
        <div className="desk">
          <div className="two" style={{ marginTop: 12 }}>
            <div className="sec"><PicksBox articles={articles} picks={curated.picks} /></div>
            {(data.obits || demo) && <div className="sec"><ObitsBox items={data.obits?.items} /></div>}
          </div>
        </div>

        <div className="mob"><PicksBox articles={articles} picks={curated.picks} rail /></div>

        <AdBanner variant={4} className="adrow ad90" />

        {/* For You — client-only recommendations from local read history */}
        <ForYou articles={articles} />

        {/* Flagship national news — brought up as the first section after the fold */}
        <div className="sec">
          <SecHd t="أخبار الأردن" slug="politics" tabs={['الكل', 'حوادث', 'محافظات']} meta={`تحديث ${ago(jordan[0]?.publishedAt)} · ${articles.length} خبراً`} />
          <div className="gov"><small>أخبار محافظتك:</small>{['عمّان', 'إربد', 'الزرقاء', 'العقبة', 'الكرك', 'معان', 'البلقاء'].map((g, i) => <a key={g} href={`/tag/${encodeURIComponent(g)}`} className={i === 0 ? 'on' : ''}>{g}</a>)}<a href="/category/politics">+5</a></div>
          <Cards items={jordan} /><Smalls items={jordanS} /><More slug="politics" />
        </div>

        {/* real columnists (newest opinion piece each) replace the illustrative band as soon as one exists (D-067) */}
        {writers.length ? <WritersBand authors={writers} className="writers mob" /> : demo && (
          <div className="writers mob">
            {WRITERS.slice(0, 8).map((w, k) => (
              <a key={w} className="writer" href="/category/writers"><div className="ph"><Img src={face(k)} /></div><div className="t"><span className="name">{w}</span>{['لماذا تأخر قانون الضمان الجديد؟', 'الدينار والدولار', 'ماذا بعد اجتماع عمّان؟', 'الجامعات بين التصنيف والتمويل', 'شباب المحافظات', 'المناخ ليس ترفاً', 'الإعلام الرقمي', 'كرة القدم كقوة ناعمة'][k]}</div></a>
            ))}
          </div>
        )}

        {/* ────────── ZONE 4 · CORE NEWS (contiguous, native ads woven in) ────────── */}
        {(data.royal || demo) && <div className="sec roy"><SecHd t="الديوان الملكي العامر" slug="politics" cls="gold" meta={upd(data.royal) ?? 'أنشطة اليوم'} /><Royal items={data.royal?.items} /></div>}

        <TrendingNow items={trending} />

        <div className="sec eco">
          <SecHd t="اقتصاد وأسواق" slug="economy" tabs={['الأخبار', 'أسواق', 'بنوك', 'طاقة', 'تحليل']} meta="القسم الرئيسي" />
          <Cards items={econ} five /><Smalls items={econS} /><More slug="economy" />
        </div>

        {/* today's digest */}
        {data.sixty || demo ? (
          <div className="two">
            <div className="sec" style={{ flex: 2 }}><SecHd t="في 60 ثانية" meta="قصة اليوم مختصرة" /><Sixty items={data.sixty?.items} /></div>
            <div className="sec" style={{ flex: 1 }}><SecHd t="الأكثر قراءة" /><MostRead articles={newsOnly} /></div>
          </div>
        ) : (
          <div className="sec"><SecHd t="الأكثر قراءة" /><MostRead articles={newsOnly} /></div>
        )}

        <AdBanner variant={1} className="adrow ad90" />

        <div className="two">
          <div className="sec"><SecHd t="فلسطين" slug="palestine" /><BigText a={pal[0]} more={pal.slice(1)} />{demo && <div style={{ marginTop: 10 }}><Timeline /></div>}</div>
          <div className="sec"><SecHd t="العالم" slug="world" /><BigText a={world[0]} more={world.slice(1)} /><More slug="world" /></div>
        </div>

        {demo ? (<>
          <div className="two">
            <div className="sec"><SecHd t="قرارات مجلس الوزراء وتعيينات" slug="parliament" meta={upd(data.decisions) ?? 'جلسة الثلاثاء · 14 قراراً'} /><Decisions items={data.decisions?.items} /><More slug="parliament" /></div>
            <div className="sec"><SecHd t="كيف صوّت نائبك؟" slug="parliament" meta="من محاضر مجلس النواب" /><VoteTracker /></div>
          </div>

          <div className="two">
            <div className="sec"><SecHd t="النشامى ودوري المحترفين" slug="sports" meta="حيّ · من الاتحاد الأردني" /><Sports /></div>
            <div className="sec"><SecHd t="الأردنيون في الخارج" meta="يظهر مميزاً للزائر من الخليج" /><Diaspora fx={data.fx} /></div>
          </div>
        </>) : (data.decisions || data.fx) && (
          <div className="two">
            {data.decisions && <div className="sec"><SecHd t="قرارات مجلس الوزراء وتعيينات" slug="parliament" meta={upd(data.decisions)} /><Decisions items={data.decisions.items} /><More slug="parliament" /></div>}
            {data.fx && <div className="sec"><SecHd t="الأردنيون في الخارج" meta="ساعات وأسعار صرف حقيقية" /><Diaspora fx={data.fx} /></div>}
          </div>
        )}

        <AdBanner variant={3} className="adrow ad90" />

        {/* opinion — real columnists when the desk has published opinion pieces (D-067); otherwise the
            illustrative portraits and columns while the demo switch is on (F-02) */}
        {writers.length > 0 && <div className="sec"><SecHd t="كتاب المتابع" slug="writers" meta="آراء · وجهة نظر · مقالات مختارة" /><WritersBand authors={writers} /><More slug="writers" /></div>}
        {!writers.length && demo && <div className="sec"><SecHd t="كتاب المتابع" slug="writers" meta="آراء · وجهة نظر · ديوان · مقالات مختارة" />
          <div className="writers desk">
            {WRITERS.slice(0, 8).map((w, k) => (
              <a key={w} className="writer" href="/category/writers">
                <div className="ph"><Img src={face(k)} /></div>
                <div className="t"><span className="name">{w}</span>{['لماذا تأخر قانون الضمان الجديد؟', 'الدينار والدولار: قراءة في قرار المركزي', 'ماذا بعد اجتماع عمّان؟', 'الجامعات بين التصنيف والتمويل', 'شباب المحافظات وفرص العمل', 'المناخ ليس ترفاً', 'الإعلام الرقمي ومسؤولية الكلمة', 'كرة القدم كقوة ناعمة'][k]}</div>
              </a>
            ))}
          </div>
          <WritersRail articles={writerPieces} /><div id="debate" style={{ marginTop: 12, scrollMarginTop: 80 }}><Debate /></div><More slug="writers" /></div>}

        <div className="two">
          <div className="sec"><SecHd t="تعليم وجامعات" slug="education" /><Cards items={edu} /><More slug="education" /></div>
          {parl[0] && <div className="sec"><SecHd t="البرلمان" slug="parliament" /><BigText a={parl[0]} more={parl.slice(1)} /><More slug="parliament" /></div>}
        </div>

        <div className="sec"><SecHd t="شرق وغرب" slug="east-west" /><Cards items={east} /><Smalls items={eastS} /><More slug="east-west" /></div>

        <div className="two">
          <div className="sec rnd"><SecHd t="فيديو المتابع" slug="video" /><Smalls items={vids} cols={1} /><More slug="video" /></div>
          <div className="sec rnd"><SecHd t="كاريكاتير" slug="caricature" /><Smalls items={cartoons} cols={1} /><More slug="caricature" /></div>
        </div>

        <AdBanner variant={6} className="adrow ad90 adbillboard" />

        {/* ────────── ZONE 5 · SERVICES & TOOLS — desk-managed rows when fresh (D-076), illustrative only in demo mode ────────── */}
        {(data.crossings || data.roads || data.services || demo) && (
          <div className="three">
            {(data.crossings || demo) && <div className="sec"><SecHd t="المعابر والمطار الآن" meta={upd(data.crossings) ?? 'كل 15 دقيقة'} /><Crossings items={data.crossings?.items} /></div>}
            {(data.roads || demo) && <div className="sec"><SecHd t="الطرق الآن" meta={upd(data.roads) ?? 'مباشر'} /><Roads items={data.roads?.items} updatedAt={data.roads?.updatedAt} /></div>}
            {(data.services || demo) && <div className="sec"><SecHd t="خدمات وتواريخ تهمّك" meta={upd(data.services) ?? 'من الجهات الرسمية'} /><Services items={data.services?.items} /></div>}
          </div>
        )}
        {demo && <div className="sec"><SecHd t="أدوات المتابع" meta="حسابات تقديرية · تُحدَّث مع كل قرار رسمي" /><div className="tools"><TaxCalc /><CustomsCalc /><ElecCalc /><AdmissionCalc /></div></div>}

        {data.jobs || demo ? (
          <div className="two">
            <div className="sec"><SecHd t="وظائف وعطاءات" slug="jobs" meta={upd(data.jobs) ?? 'ديوان الخدمة المدنية · دائرة العطاءات'} /><Jobs items={data.jobs?.items} />{!data.jobs && <More slug="jobs" />}</div>
            <div className="sec"><SecHd t="صحة وبيئة" slug="health" /><Smalls items={health} cols={1} /><More slug="health" /></div>
          </div>
        ) : (
          <div className="sec"><SecHd t="صحة وبيئة" slug="health" /><Smalls items={health} cols={1} /><More slug="health" /></div>
        )}

        <div className="two capfact">
          <div className="sec" id="newsletter" style={{ flex: '0 0 330px', scrollMarginTop: 80 }}><SecHd t="قناة المتابع" /><Capture /></div>
          {(data.facts || demo) && <div className="sec"><SecHd t="تحقق المتابع" meta={upd(data.facts) ?? 'نتحقق من الشائعات المنتشرة على فيسبوك وواتساب'} /><FactCheck items={data.facts?.items} /></div>}
        </div>

        <AdBanner variant={0} className="adrow ad90" />

        {/* ────────── ZONE 6 · COMMUNITY & LIGHTER (illustrative until sourced — F-02) ────────── */}
        {demo && (<>
          <CommunityBand />

          <div className="three">
            <div className="sec"><SecHd t="عين المواطن" meta="محتوى القراء · مُراجَع" /><Ugc /></div>
            <div className="sec"><SecHd t="تهاني ومبروك" meta="إعلانات مبوبة" /><Greetings /></div>
            <div className="sec"><SecHd t="ذاكرة الأردن" meta="يومياً" /><Memory /></div>
          </div>

          {/* J13–J15 seasonal (in season or ?season=all) */}
          <Seasonal season={season} />
        </>)}

        <div className="sec"><SecHd t="ليالي المتابع" slug="nights" /><Carousel items={nights} /><More slug="nights" /></div>

        <div className="sec">
          <SecHd t="بانوراما" slug="panorama" />
          <div className="pano">
            <div className="grid">{pano.slice(1).map((a) => <a key={a.id} className="th" href={link(a)} aria-label={a.title}><Img src={a.featuredImageUrl} /></a>)}</div>
            <div className="big"><a className="im" href={link(pano[0])} style={{ display: 'block' }} aria-label={pano[0].title}><Img src={pano[0].featuredImageUrl} /></a><a className="t" href={link(pano[0])}>{pano[0].title}</a><p>{excerpt(pano[0], 220)}</p></div>
          </div>
          <More slug="panorama" />
        </div>

        <AdBanner variant={2} className="adrow ad90" />

        <MostDiscussed items={latestArticles.filter((a) => a.kind !== 'SPONSORED')} />

        {/* video: the desk's VIDEO articles (D-068); the placeholder playlist only while none exists and the demo switch is on */}
        {videos.length > 0
          ? <div className="sec"><SecHd t="فيديو المتابع" slug="video" meta="يُحمَّل المشغّل عند الضغط" /><VideoSection items={videos} /></div>
          : demo && <div className="sec"><SecHd t="فيديو المتابع" slug="video" meta="يُحمَّل المشغّل عند الضغط" /><VideoSection /></div>}
        {caricatures.some((a) => a.featuredImageUrl) && <div className="sec"><SecHd t="كاريكاتير المتابع" slug="caricature" /><CaricatureBand items={caricatures} /></div>}
      </div>

      <SiteFooter />
      <a className="totop mob" href="#top" aria-label="العودة إلى الأعلى">▲</a>
      <div className="mob"><AudioPill articles={articles} mini /></div>
    </div>
  );
}
