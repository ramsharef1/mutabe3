'use client';

import { useEffect, useState } from 'react';

interface Article {
  id: string;
  title: string;
  summary?: string;
  content: string;
  category?: { name: string; slug: string };
  publishedAt?: string;
  viewsCount?: number;
  featuredImageUrl?: string;
}

const WRITERS = [
  'د. هاني الخصاونة',
  'م. ليلى العبادي',
  'أ. فارس الزعبي',
  'د. سناء المجالي',
  'خالد الرواشدة',
  'د. ريم النعيمات',
  'ياسر الحياري',
  'د. عمر الطراونة',
  'رنا الشوابكة',
  'د. محمود العجارمة',
  'سهى الحمود',
  'أ. باسم الخريشا',
];

const OBITS = [
  'الحاج محمد عبدالله الخلايلة في ذمة الله',
  'الشيخ عوض سالم المجالي في ذمة الله',
  'الحاجة فاطمة أحمد الزعبي في ذمة الله',
  'المهندس سامر خليل الطراونة في ذمة الله',
  'الدكتور يوسف محمود العبادي في ذمة الله',
];

const NAV = [
  'اخبار الاردن',
  'شرق وغرب',
  'اقتصاد',
  'تعليم و جامعات',
  'العالم',
  'فلسطين',
  'البرلمان',
  'بانوراما',
  'كتاب متابع',
  'ليالي متابع',
  'صحة وبيئة',
  'كاريكاتير',
  'فيديو',
];

const css = `
*{box-sizing:border-box}
.am{direction:rtl;text-align:right;font-family:Arial,Tahoma,sans-serif;font-size:13px;color:#101033;background:#fff;margin:0}
.am a{color:inherit;text-decoration:none}
.am a:hover{color:#990000}
.wrap{width:1002px;margin:0 auto}
.topmenu{background:#990000;height:35px;color:#fff;font-size:12px}
.topmenu .wrap{display:flex;justify-content:space-between;align-items:center;height:35px}
.topmenu .links{display:flex}
.topmenu .links span{padding:0 11px;border-right:1px solid #b53a3a;line-height:16px;cursor:pointer}
.topmenu .links span:first-child{border-right:0;padding-right:0}
.weather{display:flex;gap:10px;align-items:center;font-weight:bold}
.weather .city{font-size:11px;line-height:1.1;text-align:center;padding:0 8px;border-right:1px solid #b53a3a}
.weather .deg{font-size:19px}
.weather .en{font-size:11px;letter-spacing:.5px;padding-right:10px;border-right:1px solid #b53a3a}
.nav{border-top:1px solid #a80101;border-bottom:1px solid #a80101;background:#fff}
.nav ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;align-items:center}
.nav li{padding:0 10px;border-left:1px solid #999;font-weight:bold;font-size:15px;line-height:32px;white-space:nowrap;cursor:pointer}
.nav li:last-child{border-left:0}
.brand{display:flex;justify-content:space-between;align-items:center;height:112px;padding:8px 0}
.logo{text-align:center;padding-left:6px}
.logo b{display:block;font-size:56px;font-weight:bold;color:#c9a227;font-family:'Traditional Arabic','Arial',serif;line-height:1;text-shadow:1px 1px 0 #7d5f05}
.logo small{display:block;font-size:11px;color:#990000;letter-spacing:4px;margin-top:2px}
.ad{background:#ececec;border:1px solid #d9d9d9;display:flex;align-items:center;justify-content:center;color:#999;font-size:11px}
.ad728{width:728px;height:90px}
.writers{border-top:1px solid #a80101;border-bottom:1px solid #a80101;display:grid;grid-template-columns:repeat(4,1fr);padding:4px 0}
.writer{display:flex;gap:8px;padding:6px 8px;border-left:1px solid #e5e5e5;min-height:66px}
.writer:nth-child(4n){border-left:0}
.writer .ph{width:70px;height:55px;flex:none;overflow:hidden;background:#ddd}
.writer .ph img{width:100%;height:100%;object-fit:cover}
.writer .name{color:#f00;font-weight:bold;font-size:13px;display:block}
.writer .t{font-size:12px;font-weight:bold;color:#222;line-height:1.35}
.ticker{background:#ededed;height:26px;display:flex;align-items:center;font-size:13px;font-weight:bold;color:#990000;overflow:hidden;border-bottom:1px solid #ccc;margin-top:6px}
.ticker .lbl{background:#990000;color:#fff;padding:0 12px;height:26px;line-height:26px;margin-left:12px;flex:none}
.ads3{display:flex;gap:6px;margin:8px 0}
.ads3 .ad{flex:1;height:60px}
.main{display:flex;gap:12px;margin:6px 0 12px;border-top:2px solid #a80101;padding-top:10px}
.hero{width:352px;flex:none}
.hero .img{width:350px;height:350px;background:#ddd;overflow:hidden}
.hero .img img{width:100%;height:100%;object-fit:cover}
.hero h2{font-size:24px;font-weight:bold;margin:12px 8px 0 0;line-height:1.3;color:#000}
.mid{width:340px;flex:none}
.item{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #ddd}
.item:first-child{padding-top:0}
.item .th{width:90px;height:66px;flex:none;background:#ddd;overflow:hidden}
.item .th img{width:100%;height:100%;object-fit:cover}
.item .t{font-size:13px;font-weight:bold;color:#000;line-height:1.35}
.side{flex:1;min-width:0}
.box{border:1px solid #ccc;margin-bottom:10px;background:#fff}
.box .hd{background:linear-gradient(#fafafa,#dcdcdc);border-bottom:1px solid #bbb;height:27px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;font-weight:bold;font-size:14px;color:#111}
.box .hd i{display:inline-block;width:14px;height:14px;border:1px solid #990000;color:#990000;font-size:9px;line-height:12px;text-align:center;border-radius:2px;font-style:normal}
.box ul{list-style:none;margin:0;padding:4px 8px}
.arr li,.box li{padding:6px 14px 6px 0;position:relative;font-size:12.5px;font-weight:bold;color:#222;line-height:1.4;border-bottom:1px dotted #ddd}
.arr li:last-child,.box li:last-child{border-bottom:0}
.arr li:before,.box li:before{content:'';position:absolute;right:0;top:10px;border:5px solid transparent;border-right:6px solid #c00}
.arr{list-style:none;margin:0;padding:0}
.sec{margin:14px 0 0;min-width:0}
.sec .hd{display:flex;align-items:center;gap:6px;border-bottom:1px solid #bbb;padding-bottom:4px;margin-bottom:8px}
.sec .hd b{font-size:15px;color:#111}
.sec .hd i{width:9px;height:9px;background:#990000;display:inline-block}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.cards5{grid-template-columns:repeat(5,1fr)}
.card .im{width:100%;aspect-ratio:218/160;background:#ddd;overflow:hidden}
.card .im img{width:100%;height:100%;object-fit:cover}
.card .t{font-size:13px;font-weight:bold;color:#000;margin-top:5px;line-height:1.35}
.smalls{display:grid;grid-template-columns:repeat(4,1fr);gap:0 10px;margin-top:8px}
.smalls3{grid-template-columns:repeat(3,1fr)}
.smalls1{grid-template-columns:1fr}
.sm{display:flex;gap:6px;padding:6px 0;border-top:1px solid #e3e3e3}
.sm .th{width:58px;height:58px;flex:none;background:#ddd;overflow:hidden}
.sm .th img{width:100%;height:100%;object-fit:cover}
.sm .t{font-size:12px;font-weight:bold;color:#222;line-height:1.35}
.sm .name{color:#f00;display:block;font-size:12px}
.rnd .sm .th{border-radius:50%}
.more{display:flex;justify-content:flex-end;margin-top:6px}
.more span{font-size:11px;color:#666;background:#eee;border:1px solid #ddd;padding:1px 8px;cursor:pointer}
.more span:before{content:'▲';color:#990000;margin-left:4px;font-size:9px}
.two{display:flex;gap:16px}
.two>.sec{flex:1}
.three{display:flex;gap:16px}
.three>.sec{flex:1}
.four{display:flex;gap:16px}
.four>.sec{flex:1}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.carousel{display:flex;align-items:center;gap:8px}
.carousel .arrbtn{width:22px;height:22px;border-radius:50%;background:#444;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;flex:none;cursor:pointer}
.carousel .row{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;flex:1}
.bigtext{display:flex;gap:10px}
.bigtext .im{width:200px;height:150px;flex:none;background:#ddd;overflow:hidden}
.bigtext .im img{width:100%;height:100%;object-fit:cover}
.bigtext .t{font-size:14px;font-weight:bold;color:#000;line-height:1.35}
.bigtext p{font-size:12px;color:#444;line-height:1.55;margin:6px 0 0}
.poll{border:1px solid #ddd;background:#f7f7f7;padding:12px;font-size:12px;min-height:170px;color:#444}
.poll b{display:block;margin-bottom:8px;color:#111}
.poll label{display:block;padding:4px 0}
.poll button{background:#990000;color:#fff;border:0;padding:5px 14px;font-weight:bold;margin-top:8px;cursor:pointer}
.pano{display:flex;gap:10px}
.pano .big{flex:1}
.pano .big .im{width:100%;aspect-ratio:4/3;background:#ddd;overflow:hidden}
.pano .big .im img{width:100%;height:100%;object-fit:cover}
.pano .big .t{font-size:13px;font-weight:bold;color:#990000;margin-top:6px}
.pano .big p{font-size:11.5px;color:#444;margin:4px 0 0;line-height:1.5}
.pano .grid{width:150px;display:grid;grid-template-columns:1fr 1fr;gap:6px;align-content:start}
.pano .grid .th{aspect-ratio:1;background:#ddd;overflow:hidden}
.pano .grid .th img{width:100%;height:100%;object-fit:cover}
.video{display:flex;gap:10px}
.video .big{flex:1;aspect-ratio:16/9;background:#111;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
.video .big img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
.video .play{position:relative;width:68px;height:48px;background:#f00;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px}
.video .cap{position:absolute;bottom:0;right:0;left:0;background:rgba(0,0,0,.6);color:#fff;font-size:13px;font-weight:bold;padding:8px 10px}
.video .col{width:150px;display:flex;flex-direction:column;gap:8px}
.video .col .th{height:84px;background:#222;overflow:hidden}
.video .col .th img{width:100%;height:100%;object-fit:cover;filter:brightness(.6)}
.footer{border-top:2px solid #a80101;margin-top:16px;padding:10px 0 22px;background:#f6f6f6}
.ficons{display:flex;justify-content:space-between;padding:6px 0 10px;border-bottom:1px solid #ddd}
.ficon{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:bold;color:#333}
.ficon i{width:28px;height:28px;border-radius:50%;background:#990000;display:inline-block}
.fsub{display:flex;justify-content:space-between;font-size:11px;color:#555;padding:8px 0;border-bottom:1px solid #ddd}
.fsub span{cursor:pointer}
.copy{text-align:center;font-size:11px;color:#333;padding:12px 0 8px;font-weight:bold}
.social{display:flex;justify-content:center;gap:12px;padding:6px 0}
.social i{width:24px;height:24px;background:#333;display:inline-block;border-radius:3px}
.host{text-align:center;font-size:11px;color:#666;margin-top:6px}
`;

const Img = ({ src, alt = '' }: { src?: string; alt?: string }) => {
  const [err, setErr] = useState(false);
  if (!src || err) return <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#c9c9c9,#8f8f8f)' }} />;
  return <img src={src} alt={alt} loading="lazy" onError={() => setErr(true)} />;
};

const face = (i: number) => `https://i.pravatar.cc/140?img=${(i % 60) + 5}`;

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/articles')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setArticles(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || articles.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Arial' }}>جاري تحميل الأخبار...</div>;
  }

  const at = (i: number) => articles[i % articles.length];
  const seq = (from: number, n: number) => Array.from({ length: n }, (_, k) => at(from + k));

  const SecHd = ({ t }: { t: string }) => (
    <div className="hd"><i /><b>{t}</b></div>
  );
  const More = () => <div className="more"><span>المزيد</span></div>;

  const Cards = ({ from, n = 4, five = false }: { from: number; n?: number; five?: boolean }) => (
    <div className={`cards ${five ? 'cards5' : ''}`}>
      {seq(from, n).map((a, k) => (
        <a key={`${a.id}-${k}`} className="card" href="#">
          <div className="im"><Img src={a.featuredImageUrl} /></div>
          <div className="t">{a.title}</div>
        </a>
      ))}
    </div>
  );

  const Smalls = ({ from, n = 8, cols = 4, writer = false }: { from: number; n?: number; cols?: number; writer?: boolean }) => (
    <div className={`smalls ${cols === 3 ? 'smalls3' : ''} ${cols === 1 ? 'smalls1' : ''}`}>
      {seq(from, n).map((a, k) => (
        <a key={`${a.id}-${k}`} className="sm" href="#">
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
        <a key={`${a.id}-${k}`} className="card" href="#">
          <div className="im"><Img src={a.featuredImageUrl} /></div>
          <div className="t">{a.title}</div>
        </a>
      ))}
    </div>
  );

  const Bullets = ({ from, n = 5, items }: { from?: number; n?: number; items?: string[] }) => (
    <ul className="arr">
      {(items ?? seq(from ?? 0, n).map((a) => a.title)).map((t, k) => <li key={k}><a href="#">{t}</a></li>)}
    </ul>
  );

  const BigText = ({ from }: { from: number }) => {
    const a = at(from);
    return (
      <>
        <div className="bigtext">
          <div className="im"><Img src={a.featuredImageUrl} /></div>
          <div>
            <a className="t" href="#">{a.title}</a>
            <p>{a.summary || a.content}</p>
          </div>
        </div>
        <div style={{ marginTop: 6 }}><Bullets from={from + 1} n={3} /></div>
      </>
    );
  };

  return (
    <div className="am">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Top red utility bar */}
      <div className="topmenu">
        <div className="wrap">
          <div className="links">
            <span>الرئيسية</span><span>ارسل لنا</span><span>اتصل بنا</span><span>البحث</span><span>حول الموقع</span><span>أخبار اليوم</span>
          </div>
          <div className="weather">
            <span className="city">عمّان<br />الآن</span>
            <span className="deg">24°</span>
            <span>☀</span>
            <span className="city">المزيد ▾</span>
            <span className="en">ENGLISH</span>
          </div>
        </div>
      </div>

      <div className="wrap">
        {/* Category nav */}
        <div className="nav">
          <ul>{NAV.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>

        {/* Logo + leaderboard */}
        <div className="brand">
          <div className="logo"><b>متابع</b><small>وكالة متابع الإخبارية</small></div>
          <div className="ad ad728">إعلان 728×90</div>
        </div>

        {/* Columnists strip */}
        <div className="writers">
          {seq(0, 8).map((a, k) => (
            <a key={`w-${k}`} className="writer" href="#">
              <div className="ph"><Img src={face(k)} /></div>
              <div className="t"><span className="name">{WRITERS[k]}</span>{a.title}</div>
            </a>
          ))}
        </div>

        {/* Ticker */}
        <div className="ticker"><span className="lbl">عاجل</span><span>{at(0).title} — {at(1).title}</span></div>

        {/* 3 ads */}
        <div className="ads3"><div className="ad">إعلان</div><div className="ad">إعلان</div><div className="ad">إعلان</div></div>

        {/* Hero + mid list + side boxes */}
        <div className="main">
          <div className="hero">
            <div className="img"><Img src={at(0).featuredImageUrl} /></div>
            <h2><a href="#">{at(0).title}</a></h2>
          </div>
          <div className="mid">
            {seq(1, 7).map((a, k) => (
              <a key={`m-${k}`} className="item" href="#">
                <div className="th"><Img src={a.featuredImageUrl} /></div>
                <div className="t">{a.title}</div>
              </a>
            ))}
          </div>
          <div className="side">
            <div className="box">
              <div className="hd"><span>آخر الأنباء</span><i>‹</i></div>
              <ul>{seq(8, 7).map((a, k) => <li key={`l-${k}`}><a href="#">{a.title}</a></li>)}</ul>
            </div>
            <div className="box">
              <div className="hd"><span>وفيات</span><i>‹</i></div>
              <ul>{OBITS.map((t, k) => <li key={`o-${k}`}><a href="#">{t}</a></li>)}</ul>
            </div>
          </div>
        </div>

        <div className="ad" style={{ height: 90 }}>إعلان 1002×90</div>

        {/* اقتصاد */}
        <div className="sec"><SecHd t="اقتصاد" /><Cards from={2} /><Smalls from={6} /><More /></div>

        {/* شرق وغرب */}
        <div className="sec"><SecHd t="شرق وغرب" /><Cards from={10} /><Smalls from={14} /><More /></div>

        {/* البرلمان | حراك */}
        <div className="two">
          <div className="sec"><SecHd t="البرلمان" /><Grid3 from={3} /><More /></div>
          <div className="sec"><SecHd t="حراك" /><Grid3 from={9} /><More /></div>
        </div>

        <div className="ads3"><div className="ad">إعلان</div><div className="ad">إعلان</div><div className="ad">إعلان</div></div>

        {/* Four opinion columns */}
        <div className="four">
          {['آراء', 'وجهة نظر', 'صحفة', 'نقاش'].map((t, k) => (
            <div className="sec" key={t}><SecHd t={t} /><Smalls from={k + 1} n={1} cols={1} writer /></div>
          ))}
        </div>

        {/* ليالي متابع carousel */}
        <div className="sec">
          <SecHd t="ليالي متابع" />
          <div className="carousel">
            <span className="arrbtn">‹</span>
            <div className="row">
              {seq(5, 7).map((a, k) => (
                <a key={`c-${k}`} className="card" href="#">
                  <div className="im"><Img src={a.featuredImageUrl} /></div>
                  <div className="t" style={{ fontSize: 11.5 }}>{a.title}</div>
                </a>
              ))}
            </div>
            <span className="arrbtn">›</span>
          </div>
          <More />
        </div>

        <div className="ad" style={{ height: 90, marginTop: 12 }}>إعلان 1002×90</div>

        {/* ديوان | مقالات مختارة | كتاب متابع */}
        <div className="three">
          <div className="sec"><SecHd t="ديوان" /><Bullets from={12} n={6} /><More /></div>
          <div className="sec rnd"><SecHd t="مقالات مختارة" /><Smalls from={4} n={5} cols={1} writer /><More /></div>
          <div className="sec rnd"><SecHd t="كتاب متابع" /><Smalls from={8} n={5} cols={1} writer /><More /></div>
        </div>

        {/* تعليم وجامعات */}
        <div className="sec"><SecHd t="تعليم وجامعات" /><Cards from={1} n={5} five /><More /></div>

        {/* رياضة | ثقافة */}
        <div className="two">
          <div className="sec"><SecHd t="رياضة" /><BigText from={2} /><More /></div>
          <div className="sec"><SecHd t="الثقافة" /><BigText from={13} /><More /></div>
        </div>

        {/* فلسطين | العالم */}
        <div className="two">
          <div className="sec"><SecHd t="فلسطين" /><Bullets from={5} /><More /></div>
          <div className="sec"><SecHd t="العالم" /><Bullets from={11} /><More /></div>
        </div>

        {/* وظائف | قطاعات */}
        <div className="two">
          <div className="sec"><SecHd t="وظائف" /><Grid3 from={7} /><More /></div>
          <div className="sec"><SecHd t="قطاعات" /><Grid3 from={14} /><More /></div>
        </div>

        {/* حوادث | أخبار الأردن */}
        <div className="two">
          <div className="sec"><SecHd t="حوادث" /><Bullets from={3} n={4} /><More /></div>
          <div className="sec"><SecHd t="أخبار الأردن" /><Bullets from={9} n={4} /><More /></div>
        </div>

        {/* وفيات | رسالة إلى المحرر */}
        <div className="two">
          <div className="sec"><SecHd t="وفيات" /><Bullets items={OBITS} /><More /></div>
          <div className="sec"><SecHd t="رسالة الى المحرر" /><Bullets from={16} n={5} /><More /></div>
        </div>

        {/* تكنولوجيا | صحة وبيئة | منوعات */}
        <div className="three">
          <div className="sec rnd"><SecHd t="تكنولوجيا وسيارات" /><Smalls from={2} n={6} cols={1} /><More /></div>
          <div className="sec rnd"><SecHd t="صحة وبيئة" /><Smalls from={8} n={6} cols={1} /><More /></div>
          <div className="sec rnd"><SecHd t="منوعات" /><Smalls from={14} n={6} cols={1} /><More /></div>
        </div>

        <div className="ads3"><div className="ad">إعلان</div><div className="ad">إعلان</div><div className="ad">إعلان</div></div>

        {/* بانوراما | تصويت */}
        <div className="two">
          <div className="sec" style={{ flex: 2 }}>
            <SecHd t="بانوراما" />
            <div className="pano">
              <div className="grid">{seq(6, 6).map((a, k) => <div key={`p-${k}`} className="th"><Img src={a.featuredImageUrl} /></div>)}</div>
              <div className="big">
                <div className="im"><Img src={at(4).featuredImageUrl} /></div>
                <a className="t" href="#">{at(4).title}</a>
                <p>{at(4).summary || at(4).content}</p>
              </div>
            </div>
            <More />
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

        {/* فيديو متابع */}
        <div className="sec">
          <SecHd t="فيديو متابع" />
          <div className="video">
            <div className="col">{seq(1, 3).map((a, k) => <div key={`v1-${k}`} className="th"><Img src={a.featuredImageUrl} /></div>)}</div>
            <div className="big">
              <Img src={at(3).featuredImageUrl} />
              <div className="play">▶</div>
              <div className="cap">{at(3).title}</div>
            </div>
            <div className="col">{seq(5, 3).map((a, k) => <div key={`v2-${k}`} className="th"><Img src={a.featuredImageUrl} /></div>)}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <div className="wrap">
          <div className="ficons">
            {['متابع الرياضي', 'متابع الصحي', 'متابع الصورة', 'متابع العلمي', 'نسخة الموبايل', 'Mutabe3 English'].map((t) => (
              <span className="ficon" key={t}><i />{t}</span>
            ))}
          </div>
          <div className="fsub">
            <span>خدمة اخبار الجوال</span><span>ارسل خبراً</span><span>أخبار الوفيات</span><span>خدمة RSS</span><span>حول متابع</span><span>اتصل بنا</span><span>سياسة الخصوصية</span>
          </div>
          <div className="copy">جميع الحقوق محفوظة © وكالة متابع الإخبارية {new Date().getFullYear()} — المقالات والتعليقات المنشورة تعبر عن رأي أصحابها فقط</div>
          <div className="social"><i /><i /><i /><i /></div>
          <div className="host">برمجة واستضافة mutabe3.news</div>
        </div>
      </div>
    </div>
  );
}
