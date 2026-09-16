'use client';

import { Article, WRITERS, face, Img, useArticles, Loading, SiteHeader, SiteFooter, SecHd, More, AdBanner } from './components/site';

const OBITS = [
  'الحاج محمد عبدالله الخلايلة في ذمة الله',
  'الشيخ عوض سالم المجالي في ذمة الله',
  'الحاجة فاطمة أحمد الزعبي في ذمة الله',
  'المهندس سامر خليل الطراونة في ذمة الله',
  'الدكتور يوسف محمود العبادي في ذمة الله',
];

export default function Home() {
  const { articles, loading } = useArticles();
  if (loading || articles.length === 0) return <Loading />;

  const at = (i: number) => articles[i % articles.length];
  const seq = (from: number, n: number) => Array.from({ length: n }, (_, k) => at(from + k));
  const link = (a: Article) => `/article/${a.id}`;

  const Cards = ({ from, n = 4, five = false }: { from: number; n?: number; five?: boolean }) => (
    <div className={`cards ${five ? 'cards5' : ''}`}>
      {seq(from, n).map((a, k) => (
        <a key={`${a.id}-${k}`} className="card" href={link(a)}>
          <div className="im"><Img src={a.featuredImageUrl} /></div>
          <div className="t">{a.title}</div>
        </a>
      ))}
    </div>
  );

  const Smalls = ({ from, n = 8, cols = 4, writer = false }: { from: number; n?: number; cols?: number; writer?: boolean }) => (
    <div className={`smalls ${cols === 3 ? 'smalls3' : ''} ${cols === 1 ? 'smalls1' : ''}`}>
      {seq(from, n).map((a, k) => (
        <a key={`${a.id}-${k}`} className="sm" href={link(a)}>
          <div className="th"><Img src={writer ? face(from + k) : a.featuredImageUrl} /></div>
          <div className="t">
            {writer && <span className="name">{WRITERS[(from + k) % WRITERS.length]}</span>}
            {a.title}
          </div>
        </a>
      ))}
    </div>
  );

  const Grid3 = ({ from }: { from: number }) => (
    <div className="grid3">
      {seq(from, 6).map((a, k) => (
        <a key={`${a.id}-${k}`} className="card" href={link(a)}>
          <div className="im"><Img src={a.featuredImageUrl} /></div>
          <div className="t">{a.title}</div>
        </a>
      ))}
    </div>
  );

  const Bullets = ({ from, n = 5, items }: { from?: number; n?: number; items?: string[] }) => (
    <ul className="arr">
      {items
        ? items.map((t, k) => <li key={k}><a href="#">{t}</a></li>)
        : seq(from ?? 0, n).map((a, k) => <li key={`${a.id}-${k}`}><a href={link(a)}>{a.title}</a></li>)}
    </ul>
  );

  const BigText = ({ from }: { from: number }) => {
    const a = at(from);
    return (
      <>
        <div className="bigtext">
          <a className="im" href={link(a)}><Img src={a.featuredImageUrl} /></a>
          <div>
            <a className="t" href={link(a)}>{a.title}</a>
            <p>{a.summary || a.content}</p>
          </div>
        </div>
        <div style={{ marginTop: 6 }}><Bullets from={from + 1} n={3} /></div>
      </>
    );
  };

  return (
    <div className="am">
      <SiteHeader />

      <div className="wrap">
        {/* Columnists strip */}
        <div className="writers">
          {seq(0, 8).map((a, k) => (
            <a key={`w-${k}`} className="writer" href={link(a)}>
              <div className="ph"><Img src={face(k)} /></div>
              <div className="t"><span className="name">{WRITERS[k]}</span>{a.title}</div>
            </a>
          ))}
        </div>

        <div className="ticker">
          <span className="lbl" />
          <a href={link(at(0))}>{at(0).title}</a>
          <span style={{ color: '#bbb' }}>|</span>
          <a href={link(at(1))}>{at(1).title}</a>
        </div>

        <div className="ads3"><AdBanner variant={1} /><AdBanner variant={2} /><AdBanner variant={3} /></div>

        {/* Hero + mid list + side boxes */}
        <div className="main">
          <div className="hero">
            <a className="img" href={link(at(0))}><Img src={at(0).featuredImageUrl} /></a>
            <h2><a href={link(at(0))}>{at(0).title}</a></h2>
          </div>
          <div className="mid">
            {seq(1, 7).map((a, k) => (
              <a key={`m-${k}`} className="item" href={link(a)}>
                <div className="th"><Img src={a.featuredImageUrl} /></div>
                <div className="t">{a.title}</div>
              </a>
            ))}
          </div>
          <div className="side">
            <div className="box">
              <div className="hd"><span>آخر الأنباء</span><i>‹</i></div>
              <ul>{seq(8, 7).map((a, k) => <li key={`l-${k}`}><a href={link(a)}>{a.title}</a></li>)}</ul>
            </div>
            <div className="box">
              <div className="hd"><a href="/category/obituaries">وفيات</a><i>‹</i></div>
              <ul>{OBITS.map((t, k) => <li key={`o-${k}`}><a href="/category/obituaries">{t}</a></li>)}</ul>
            </div>
          </div>
        </div>

        <AdBanner variant={4} style={{ height: 90 }} />

        <div className="sec"><SecHd t="اقتصاد" slug="economy" /><Cards from={2} /><Smalls from={6} /><More slug="economy" /></div>
        <div className="sec"><SecHd t="شرق وغرب" slug="east-west" /><Cards from={10} /><Smalls from={14} /><More slug="east-west" /></div>

        <div className="two">
          <div className="sec"><SecHd t="البرلمان" slug="parliament" /><Grid3 from={3} /><More slug="parliament" /></div>
          <div className="sec"><SecHd t="حراك" slug="harak" /><Grid3 from={9} /><More slug="harak" /></div>
        </div>

        <div className="ads3"><AdBanner variant={1} /><AdBanner variant={2} /><AdBanner variant={3} /></div>

        <div className="four">
          {[['آراء', 'opinion'], ['وجهة نظر', 'viewpoint'], ['صحفة', 'press'], ['نقاش', 'debate']].map(([t, s], k) => (
            <div className="sec" key={s}><SecHd t={t} slug={s} /><Smalls from={k + 1} n={1} cols={1} writer /></div>
          ))}
        </div>

        <div className="sec">
          <SecHd t="ليالي متابع" slug="nights" />
          <div className="carousel">
            <span className="arrbtn">‹</span>
            <div className="row">
              {seq(5, 7).map((a, k) => (
                <a key={`c-${k}`} className="card" href={link(a)}>
                  <div className="im"><Img src={a.featuredImageUrl} /></div>
                  <div className="t" style={{ fontSize: 11.5 }}>{a.title}</div>
                </a>
              ))}
            </div>
            <span className="arrbtn">›</span>
          </div>
          <More slug="nights" />
        </div>

        <AdBanner variant={3} style={{ height: 90, marginTop: 12 }} />

        <div className="three">
          <div className="sec"><SecHd t="ديوان" slug="diwan" /><Bullets from={12} n={6} /><More slug="diwan" /></div>
          <div className="sec rnd"><SecHd t="مقالات مختارة" slug="selected" /><Smalls from={4} n={5} cols={1} writer /><More slug="selected" /></div>
          <div className="sec rnd"><SecHd t="كتاب متابع" slug="writers" /><Smalls from={8} n={5} cols={1} writer /><More slug="writers" /></div>
        </div>

        <div className="sec"><SecHd t="تعليم وجامعات" slug="education" /><Cards from={1} n={5} five /><More slug="education" /></div>

        <div className="two">
          <div className="sec"><SecHd t="رياضة" slug="sports" /><BigText from={2} /><More slug="sports" /></div>
          <div className="sec"><SecHd t="الثقافة" slug="culture" /><BigText from={13} /><More slug="culture" /></div>
        </div>

        <div className="two">
          <div className="sec"><SecHd t="فلسطين" slug="palestine" /><Bullets from={5} /><More slug="palestine" /></div>
          <div className="sec"><SecHd t="العالم" slug="world" /><Bullets from={11} /><More slug="world" /></div>
        </div>

        <div className="two">
          <div className="sec"><SecHd t="وظائف" slug="jobs" /><Grid3 from={7} /><More slug="jobs" /></div>
          <div className="sec"><SecHd t="قطاعات" slug="sectors" /><Grid3 from={14} /><More slug="sectors" /></div>
        </div>

        <div className="two">
          <div className="sec"><SecHd t="حوادث" slug="accidents" /><Bullets from={3} n={4} /><More slug="accidents" /></div>
          <div className="sec"><SecHd t="أخبار الأردن" slug="politics" /><Bullets from={9} n={4} /><More slug="politics" /></div>
        </div>

        <div className="two">
          <div className="sec"><SecHd t="وفيات" slug="obituaries" /><Bullets items={OBITS} /><More slug="obituaries" /></div>
          <div className="sec"><SecHd t="رسالة الى المحرر" slug="letters" /><Bullets from={16} n={5} /><More slug="letters" /></div>
        </div>

        <div className="three">
          <div className="sec rnd"><SecHd t="تكنولوجيا وسيارات" slug="technology" /><Smalls from={2} n={6} cols={1} /><More slug="technology" /></div>
          <div className="sec rnd"><SecHd t="صحة وبيئة" slug="health" /><Smalls from={8} n={6} cols={1} /><More slug="health" /></div>
          <div className="sec rnd"><SecHd t="منوعات" slug="misc" /><Smalls from={14} n={6} cols={1} /><More slug="misc" /></div>
        </div>

        <div className="ads3"><AdBanner variant={1} /><AdBanner variant={2} /><AdBanner variant={3} /></div>

        <div className="two">
          <div className="sec" style={{ flex: 2 }}>
            <SecHd t="بانوراما" slug="panorama" />
            <div className="pano">
              <div className="grid">{seq(6, 6).map((a, k) => <a key={`p-${k}`} className="th" href={link(a)}><Img src={a.featuredImageUrl} /></a>)}</div>
              <div className="big">
                <a className="im" href={link(at(4))} style={{ display: 'block' }}><Img src={at(4).featuredImageUrl} /></a>
                <a className="t" href={link(at(4))}>{at(4).title}</a>
                <p>{at(4).summary || at(4).content}</p>
              </div>
            </div>
            <More slug="panorama" />
          </div>
          <div className="sec">
            <SecHd t="تصويت" />
            <div className="poll">
              <b>هل تؤيد قرار رفع سعر الفائدة؟</b>
              <label><input type="radio" name="p" /> نعم</label>
              <label><input type="radio" name="p" /> لا</label>
              <label><input type="radio" name="p" /> لا أعرف</label>
              <button>صوّت</button>
            </div>
          </div>
        </div>

        <div className="sec">
          <SecHd t="فيديو متابع" slug="video" />
          <div className="video">
            <div className="col">{seq(1, 3).map((a, k) => <a key={`v1-${k}`} className="th" href={link(a)}><Img src={a.featuredImageUrl} /></a>)}</div>
            <a className="big" href={link(at(3))}>
              <Img src={at(3).featuredImageUrl} />
              <div className="play">▶</div>
              <div className="cap">{at(3).title}</div>
            </a>
            <div className="col">{seq(5, 3).map((a, k) => <a key={`v2-${k}`} className="th" href={link(a)}><Img src={a.featuredImageUrl} /></a>)}</div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
