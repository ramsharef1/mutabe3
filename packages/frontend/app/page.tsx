// Server component (B9): articles + weather are fetched on the server and revalidated; interactive blocks are client islands.
import { Img, SiteHeader, SiteFooter, SecHd, More, AdBanner, Chip } from './components/site';
import { Article, WRITERS, face, ago, readMins } from './components/util';
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
import { CategoryQuickNav } from './components/blocks/categories';
import { NewsletterCTA } from './components/blocks/newsletter';
import { MostDiscussed } from './components/blocks/discussed';
import { Pool, prayerTimes, fetchWeather, hijri, ammanDate, ammanTime, currentSeason, wxText } from './components/feeds';

export const revalidate = 60;

const API = process.env.VPS_API || 'http://127.0.0.1:9080';
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
      <div><a className="t" href={link(a)}>{a.title}</a><p>{a.summary || a.content}</p></div>
    </div>
    <div style={{ marginTop: 6 }}><Bullets items={more} /></div>
  </>
);
const Ads3 = ({ v }: { v: [number, number, number] }) => (
  <div className="adrow ads3"><AdBanner variant={v[0]} /><AdBanner variant={v[1]} /><AdBanner variant={v[2]} /></div>
);

export default async function Home({ searchParams }: { searchParams?: { season?: string } }) {
  const [articles, wx] = await Promise.all([getArticles(), fetchWeather()]);
  if (!articles.length) {
    return <div className="am"><SiteHeader /><div className="wrap loading">لا تتوفر أخبار حالياً — حاول بعد قليل.</div><SiteFooter /></div>;
  }
  const now = new Date();
  const prayers = prayerTimes(now);
  const season = searchParams?.season === 'all' ? 'all' : currentSeason(now);
  const amman = wx[0];

  // B1: every block draws from an exclusive pool so the fold never repeats a story.
  const pool = new Pool(articles);
  const hero = pool.take(1)[0];
  const leadMore = pool.take(3);
  const mid = pool.take(7);
  const latest = pool.take(6);
  const premium = pool.take(3);
  const trending = pool.take(5);
  const discussed = pool.take(6);
  const jordan = pool.take(4), jordanS = pool.take(4);
  const econ = pool.take(5), econS = pool.take(4);
  const pal = pool.take(3), world = pool.take(4);
  const east = pool.take(4), eastS = pool.take(4);
  const edu = pool.take(4), culture = pool.take(3);
  const nights = pool.take(7);
  const tech = pool.take(4), misc = pool.take(4), health = pool.take(4);
  const pano = pool.take(7);
  const ticker = [hero, ...mid.slice(0, 5)];

  return (
    <div className="am home">
      <SiteHeader articles={articles} temp={amman?.t} wxLabel={amman ? wxText(amman.code) : undefined} />

      <div className="wrap">
        <UtilityStrip prayers={prayers} wx={wx} hijriText={hijri(now)} dateText={ammanDate(now)} />

        {/* Columnists strip — Ammon signature on desktop; on mobile it moves below أخبار الأردن (A9) */}
        <div className="writers desk">
          {WRITERS.slice(0, 8).map((w, k) => (
            <a key={w} className="writer" href="/category/writers">
              <div className="ph"><Img src={face(k)} /></div>
              <div className="t"><span className="name">{w}</span>{['لماذا تأخر قانون الضمان الجديد؟', 'الدينار والدولار: قراءة في قرار المركزي', 'ماذا بعد اجتماع عمّان؟', 'الجامعات بين التصنيف والتمويل', 'شباب المحافظات وفرص العمل', 'المناخ ليس ترفاً', 'الإعلام الرقمي ومسؤولية الكلمة', 'كرة القدم كقوة ناعمة'][k]}</div>
            </a>
          ))}
        </div>

        <BreakingBar />
        <MetAlert />
        <Ticker items={ticker} />
        <LiveStrip />
        <MarketStrip updated={ammanTime(now)} />
        <Missed articles={articles} />

        {/* Premium Spotlight */}
        <PremiumSpotlight items={premium} />

        <CategoryQuickNav />

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
            <div className="desk"><NewsletterCTA /></div>
            <LatestBox items={latest} />
          </div>
        </div>

        {/* Picks + Obituaries below the fold (desktop) so the sidebar height matches the main column */}
        <div className="desk">
          <div className="two" style={{ marginTop: 12 }}>
            <div className="sec"><PicksBox articles={articles} /></div>
            <div className="sec"><ObitsBox /></div>
          </div>
        </div>

        <div className="mob"><PicksBox articles={articles} rail /></div>

        <AdBanner variant={4} className="adrow ad90" />

        {/* For You — client-only recommendations from local read history */}
        <ForYou articles={articles} />

        {/* J6 royal strip */}
        <div className="sec roy"><SecHd t="الديوان الملكي العامر" slug="politics" cls="gold" meta="أنشطة اليوم" /><Royal /></div>

        {/* Trending Now */}
        <TrendingNow items={trending} />

        {/* B2 أخبار الأردن first, with tabs + governorate chips (C6) */}
        <div className="sec">
          <SecHd t="أخبار الأردن" slug="politics" tabs={['الكل', 'حوادث', 'محافظات']} meta={`تحديث ${ago(jordan[0]?.publishedAt)} · ${articles.length} خبراً`} />
          <div className="gov"><small>أخبار محافظتك:</small>{['عمّان', 'إربد', 'الزرقاء', 'العقبة', 'الكرك', 'معان', 'البلقاء'].map((g, i) => <a key={g} href={`/tag/${encodeURIComponent(g)}`} className={i === 0 ? 'on' : ''}>{g}</a>)}<a href="/category/politics">+5</a></div>
          <Cards items={jordan} /><Smalls items={jordanS} /><More slug="politics" />
        </div>

        <div className="writers mob">
          {WRITERS.slice(0, 8).map((w, k) => (
            <a key={w} className="writer" href="/category/writers"><div className="ph"><Img src={face(k)} /></div><div className="t"><span className="name">{w}</span>{['لماذا تأخر قانون الضمان الجديد؟', 'الدينار والدولار', 'ماذا بعد اجتماع عمّان؟', 'الجامعات بين التصنيف والتمويل', 'شباب المحافظات', 'المناخ ليس ترفاً', 'الإعلام الرقمي', 'كرة القدم كقوة ناعمة'][k]}</div></a>
          ))}
        </div>

        {/* J3–J5 */}
        <div className="three">
          <div className="sec"><SecHd t="المعابر والمطار الآن" meta="كل 15 دقيقة" /><Crossings /></div>
          <div className="sec"><SecHd t="الطرق الآن" meta="مباشر" /><Roads /></div>
          <div className="sec"><SecHd t="خدمات وتواريخ تهمّك" meta="من الجهات الرسمية" /><Services /></div>
        </div>

        {/* B4 flagship economy + C4 tools row */}
        <div className="sec eco">
          <SecHd t="اقتصاد وأسواق" slug="economy" tabs={['الأخبار', 'أسواق', 'بنوك', 'طاقة', 'تحليل']} meta="القسم الرئيسي" />
          <Cards items={econ} five /><Smalls items={econS} /><More slug="economy" />
        </div>
        <div className="sec"><SecHd t="أدوات المتابع" meta="حسابات تقديرية · تُحدَّث مع كل قرار رسمي" /><div className="tools"><TaxCalc /><CustomsCalc /><ElecCalc /><AdmissionCalc /></div></div>

        <Ads3 v={[1, 2, 3]} />

        {/* C5 + C3 */}
        <div className="two">
          <div className="sec" style={{ flex: 2 }}><SecHd t="في 60 ثانية" meta="قصة اليوم مختصرة" /><Sixty /></div>
          <div className="sec" style={{ flex: 1 }}><SecHd t="الأكثر قراءة" /><MostRead articles={articles} /></div>
        </div>

        {/* Community band — surfaces polls/debate/UGC prominently */}
        <CommunityBand />

        {/* B3 فلسطين/العالم + C8 timeline */}
        <div className="two">
          <div className="sec"><SecHd t="فلسطين" slug="palestine" /><BigText a={pal[0]} more={pal.slice(1)} /><div style={{ marginTop: 10 }}><Timeline /></div></div>
          <div className="sec"><SecHd t="العالم" slug="world" /><BigText a={world[0]} more={world.slice(1)} /><More slug="world" /></div>
        </div>

        {/* J7 + J8 */}
        <div className="two">
          <div className="sec"><SecHd t="قرارات مجلس الوزراء وتعيينات" slug="parliament" meta="جلسة الثلاثاء · 14 قراراً" /><Decisions /><More slug="parliament" /></div>
          <div className="sec"><SecHd t="كيف صوّت نائبك؟" slug="parliament" meta="من محاضر مجلس النواب" /><VoteTracker /></div>
        </div>

        <AdBanner variant={3} className="adrow ad90" />

        {/* J13–J15 seasonal (in season or ?season=all) */}
        <Seasonal season={season} />

        <div className="sec"><SecHd t="شرق وغرب" slug="east-west" /><Cards items={east} /><Smalls items={eastS} /><More slug="east-west" /></div>

        {/* J16 + J17 */}
        <div className="two">
          <div className="sec"><SecHd t="النشامى ودوري المحترفين" slug="sports" meta="حيّ · من الاتحاد الأردني" /><Sports /></div>
          <div className="sec"><SecHd t="الأردنيون في الخارج" meta="يظهر مميزاً للزائر من الخليج" /><Diaspora /></div>
        </div>

        {/* A1+A2 merged opinion + C12 */}
        <div className="sec"><SecHd t="كتاب المتابع" slug="writers" meta="آراء · وجهة نظر · ديوان · مقالات مختارة" /><WritersRail articles={pool.take(4)} /><div id="debate" style={{ marginTop: 12, scrollMarginTop: 80 }}><Debate /></div><More slug="writers" /></div>

        <div className="two">
          <div className="sec"><SecHd t="تعليم وجامعات" slug="education" /><Cards items={edu} /><More slug="education" /></div>
          <div className="sec"><SecHd t="الثقافة" slug="culture" /><BigText a={culture[0]} more={culture.slice(1)} /><More slug="culture" /></div>
        </div>

        <div className="sec"><SecHd t="ليالي المتابع" slug="nights" /><Carousel items={nights} /><More slug="nights" /></div>

        {/* C10 + health */}
        <div className="two">
          <div className="sec"><SecHd t="وظائف وعطاءات" slug="jobs" meta="ديوان الخدمة المدنية · دائرة العطاءات" /><Jobs /><More slug="jobs" /></div>
          <div className="sec"><SecHd t="صحة وبيئة" slug="health" /><Smalls items={health} cols={1} /><More slug="health" /></div>
        </div>

        <AdBanner variant={0} className="adrow ad90" />

        {/* C7 + C14 */}
        <div className="two capfact">
          <div className="sec" style={{ flex: '0 0 330px' }}><SecHd t="قناة المتابع" /><Capture /></div>
          <div className="sec"><SecHd t="تحقق المتابع" meta="نتحقق من الشائعات المنتشرة على فيسبوك وواتساب" /><FactCheck /></div>
        </div>

        {/* J18–J20 */}
        <div className="three">
          <div className="sec"><SecHd t="عين المواطن" meta="محتوى القراء · مُراجَع" /><Ugc /></div>
          <div className="sec"><SecHd t="تهاني ومبروك" meta="إعلانات مبوبة" /><Greetings /></div>
          <div className="sec"><SecHd t="ذاكرة الأردن" meta="يومياً" /><Memory /></div>
        </div>

        <div className="two">
          <div className="sec rnd"><SecHd t="تكنولوجيا وسيارات" slug="technology" /><Smalls items={tech} cols={1} /><More slug="technology" /></div>
          <div className="sec rnd"><SecHd t="منوعات" slug="misc" /><Smalls items={misc} cols={1} /><More slug="misc" /></div>
        </div>

        <div className="sec">
          <SecHd t="بانوراما" slug="panorama" />
          <div className="pano">
            <div className="grid">{pano.slice(1).map((a) => <a key={a.id} className="th" href={link(a)}><Img src={a.featuredImageUrl} /></a>)}</div>
            <div className="big"><a className="im" href={link(pano[0])} style={{ display: 'block' }}><Img src={pano[0].featuredImageUrl} /></a><a className="t" href={link(pano[0])}>{pano[0].title}</a><p>{pano[0].summary || pano[0].content}</p></div>
          </div>
          <More slug="panorama" />
        </div>

        <AdBanner variant={2} className="adrow ad90" />

        {/* Most Discussed */}
        <MostDiscussed items={discussed} />

        <div className="sec"><SecHd t="فيديو المتابع" slug="video" meta="يُحمَّل المشغّل عند الضغط" /><VideoSection /></div>
      </div>

      <SiteFooter />
      <a className="totop mob" href="#top" aria-label="العودة إلى الأعلى">▲</a>
      <div className="mob"><AudioPill articles={articles} mini /></div>
    </div>
  );
}
