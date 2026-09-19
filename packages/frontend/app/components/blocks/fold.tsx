'use client';

import { useEffect, useRef, useState } from 'react';
import { Article, Img, Ico, ago, Chip, WRITERS, face } from '../site';
import { BREAKING, MARKET, PICKS, OBITS, SIXTY, DEBATE } from '../feeds';

const link = (a: Article) => `/article/${a.id}`;

/* ---- C1 breaking bar (only when an item is flagged) ---- */
export function BreakingBar() {
  const [open, setOpen] = useState(true);
  if (!BREAKING || !open) return null;
  return (
    <div className="brk" role="alert">
      <span className="live"><i />عاجل</span>
      <a href={BREAKING.href}><b>{BREAKING.title}</b></a>
      <span className="tm" suppressHydrationWarning>{Ico.clock}{ago(BREAKING.at)}</span>
      <a className="go" href={BREAKING.href}>تابع التغطية ›</a>
      <button type="button" className="x" onClick={() => setOpen(false)} aria-label="إخفاء">×</button>
    </div>
  );
}

/* ---- B7 ticker: red «عاجل» when breaking, calm «آخر الأخبار» otherwise; pause button; reduced-motion safe ---- */
export function Ticker({ items }: { items: Article[] }) {
  const [paused, setPaused] = useState(false);
  const hot = !!BREAKING;
  const list = [...items, ...items];
  return (
    <div className={`ticker ${hot ? 'hot' : ''} ${paused ? 'paused' : ''}`}>
      <span className="lbl"><i />{hot ? 'عاجل' : 'آخر الأخبار'}</span>
      <div className="view" aria-live="off">
        <div className="track">
          {list.map((a, k) => <a key={`${a.id}-${k}`} href={link(a)}><span className="tm">{ago(a.publishedAt)}</span>{a.title}</a>)}
        </div>
      </div>
      <button type="button" className="pause" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'تشغيل الشريط' : 'إيقاف الشريط'}>{paused ? '▶' : '❚❚'}</button>
    </div>
  );
}

/* ---- C4 market strip ---- */
export function MarketStrip({ updated }: { updated: string }) {
  return (
    <div className="mkt" aria-label="لوحة الاقتصاد">
      <a className="mlb" href="/category/economy">لوحة الاقتصاد <small>تحديث {updated}</small></a>
      <ul>
        {MARKET.map((m) => (
          <li key={m.n}><small>{m.n}</small><b>{m.v}<span className={m.d > 0 ? 'up' : m.d < 0 ? 'dn' : 'fl'}>{m.d > 0 ? '▲' : m.d < 0 ? '▼' : '•'} {m.s}</span></b></li>
        ))}
      </ul>
    </div>
  );
}

/* ---- C11 since your last visit (localStorage) ---- */
export function Missed({ articles }: { articles: Article[] }) {
  const [state, setState] = useState<{ since: Date; list: Article[] } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lastVisit');
      const now = Date.now();
      if (raw) {
        const since = new Date(parseInt(raw, 10));
        const list = articles.filter((a) => a.publishedAt && new Date(a.publishedAt) > since);
        if (list.length >= 2 && now - since.getTime() > 30 * 60000) setState({ since, list });
      }
      localStorage.setItem('lastVisit', String(now));
    } catch {}
  }, [articles]);
  if (!state) return null;
  const when = new Intl.DateTimeFormat('ar-JO-u-nu-latn', { weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(state.since);
  return (
    <div className="missed">
      <b>شو فاتك؟</b>
      <span>نشرنا <strong>{state.list.length} خبراً</strong> منذ زيارتك الأخيرة ({when})</span>
      <span className="n5">{state.list.slice(0, 3).map((a) => <a key={a.id} href={link(a)}>{a.title}</a>)}</span>
      <button type="button" className="x" onClick={() => setState(null)} aria-label="إخفاء">×</button>
    </div>
  );
}

/* ---- right rail: latest / picks / obituaries with search ---- */
export function LatestBox({ items }: { items: Article[] }) {
  return (
    <div className="box">
      <div className="hd"><span>آخر الأنباء</span><span className="tm">تحديث {ago(items[0]?.publishedAt)}</span></div>
      <ul>{items.map((a) => <li key={a.id}><a href={link(a)}>{a.title}</a><span className="tm">{ago(a.publishedAt)}</span></li>)}</ul>
    </div>
  );
}

export function PicksBox({ articles, rail = false }: { articles: Article[]; rail?: boolean }) {
  const list = PICKS.map((id) => articles.find((a) => a.id === id)).filter(Boolean) as Article[];
  if (rail) {
    return <div className="picks-rail">{list.map((a, i) => <a key={a.id} href={link(a)}><i>{i + 1}</i>{a.title}</a>)}</div>;
  }
  return (
    <div className="box">
      <div className="hd"><span>مختارات المحرر</span><i /></div>
      <ol className="picks">{list.map((a) => <li key={a.id}><a href={link(a)}>{a.title}</a></li>)}</ol>
    </div>
  );
}

export function ObitsBox() {
  const [q, setQ] = useState('');
  const list = OBITS.filter((o) => !q || o.n.includes(q) || o.a.includes(q) || o.gov.includes(q)).slice(0, 4);
  return (
    <div className="box obits">
      <div className="hd"><a href="/category/obituaries">وفيات</a><i /></div>
      <form className="obsearch" onSubmit={(e) => e.preventDefault()}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم المتوفى أو العائلة أو المنطقة…" aria-label="بحث في الوفيات" />
        <button type="submit">بحث</button>
      </form>
      <ul>
        {list.length ? list.map((o) => <li key={o.n}><a href="/category/obituaries">{o.n} في ذمة الله</a><span className="tm">العزاء: {o.a} · {o.h}</span></li>) : <li className="none">لا نتائج لـ «{q}»</li>}
      </ul>
      <a className="all" href="/category/obituaries">كل الوفيات ›</a>
    </div>
  );
}

/* ---- C3 most read with time tabs ---- */
export function MostRead({ articles }: { articles: Article[] }) {
  const [tab, setTab] = useState(0);
  const sorted = [...articles].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
  // demo windows: hour = recent+views, day = views, week = views reversed-ish
  const list = tab === 0 ? sorted.filter((a) => a.publishedAt && Date.now() - new Date(a.publishedAt).getTime() < 8 * 3600e3).slice(0, 5).concat(sorted).slice(0, 5)
    : tab === 1 ? sorted.slice(0, 5) : sorted.slice(2, 7);
  return (
    <div className="mostread">
      <div className="tabs" role="tablist">
        {['آخر ساعة', '24 ساعة', 'الأسبوع'].map((t, i) => <button type="button" role="tab" aria-selected={tab === i} key={t} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{t}</button>)}
      </div>
      <ol>{list.map((a, i) => <li key={a.id}><span className="rank">{i + 1}</span><a href={link(a)}>{a.title}<span className="tm">{Ico.eye}{(a.viewsCount || 0) * (3 - tab)} مشاهدة</span></a></li>)}</ol>
    </div>
  );
}

/* ---- C5 في 60 ثانية ---- */
export function Sixty() {
  return (
    <div className="sixty">
      {SIXTY.map((c, i) => <div className="c" key={c.k}><span className="no" aria-hidden>{i + 1}</span><small>{c.k}</small><b>{c.b}</b><p>{c.p}</p></div>)}
    </div>
  );
}

/* ---- A8 poll, functional (localStorage) ---- */
export function Poll() {
  const opts = ['نعم', 'لا', 'لا أعرف'];
  const [votes, setVotes] = useState([412, 287, 96]);
  const [mine, setMine] = useState<number | null>(null);
  useEffect(() => { try { const v = localStorage.getItem('poll1'); if (v !== null) setMine(parseInt(v, 10)); } catch {} }, []);
  const total = votes.reduce((a, b) => a + b, 0);
  const vote = (i: number) => { if (mine !== null) return; setMine(i); setVotes((v) => v.map((x, k) => (k === i ? x + 1 : x))); try { localStorage.setItem('poll1', String(i)); } catch {} };
  return (
    <fieldset className="poll">
      <legend><b>هل تؤيد قرار رفع سعر الفائدة؟</b></legend>
      {opts.map((o, i) => (
        <button type="button" key={o} className={`opt ${mine === i ? 'me' : ''}`} onClick={() => vote(i)} disabled={mine !== null}>
          <span>{o}</span>
          {mine !== null && <><span className="bar" style={{ width: `${Math.round((votes[i] / total) * 100)}%` }} /><em>{Math.round((votes[i] / total) * 100)}%</em></>}
        </button>
      ))}
      <small>{total} صوتاً · {mine === null ? 'اضغط للتصويت' : 'شكراً لمشاركتك'}</small>
    </fieldset>
  );
}

/* ---- B12 carousel with working arrows / swipe ---- */
export function Carousel({ items }: { items: Article[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (d: number) => ref.current?.scrollBy({ left: d * -240, behavior: 'smooth' }); // RTL: negative = forward
  return (
    <div className="carousel">
      <button type="button" className="arrbtn" onClick={() => go(-1)} aria-label="السابق">‹</button>
      <div className="row" ref={ref}>
        {items.map((a) => <a key={a.id} className="card" href={link(a)}><div className="im"><Img src={a.featuredImageUrl} /></div><div className="t">{a.title}</div></a>)}
      </div>
      <button type="button" className="arrbtn" onClick={() => go(1)} aria-label="التالي">›</button>
    </div>
  );
}

/* ---- C12 وجهان ---- */
export function Debate() {
  const [v, setV] = useState<[number, number]>([58, 42]);
  const [mine, setMine] = useState<'a' | 'b' | null>(null);
  const vote = (s: 'a' | 'b') => { if (mine) return; setMine(s); setV(s === 'a' ? [60, 40] : [56, 44]); };
  const side = (s: typeof DEBATE.a, key: 'a' | 'b') => (
    <div className="side2">
      <img src={face(s.face)} alt="" />
      <div>
        <span className="name">{s.name}</span>
        <span className="pos" style={{ background: s.col }}>{s.pos}</span>
        <p>{s.p}</p>
        <button type="button" onClick={() => vote(key)} disabled={!!mine} className={mine === key ? 'on' : ''}>{mine === key ? 'صوّتت لهذا الرأي' : 'أؤيد هذا الرأي'}</button>
      </div>
    </div>
  );
  return (
    <div className="debate">
      <div className="q">وجهان: {DEBATE.q}</div>
      {side(DEBATE.a, 'a')}
      <div className="vs"><b>VS</b><span className="bar" style={{ background: `linear-gradient(#1b5e20 0 ${v[0]}%, #c62828 ${v[0]}%)` }} /><small>{v[0]}% · {v[1]}%</small></div>
      {side(DEBATE.b, 'b')}
    </div>
  );
}

/* ---- merged opinion rail (A1+A2) ---- */
export function WritersRail({ articles }: { articles: Article[] }) {
  return (
    <div className="rail">
      {[0, 1, 3, 5].map((k, i) => (
        <a className="w" key={k} href={articles[i] ? link(articles[i]) : '/category/writers'}>
          <img src={face(k)} alt="" />
          <span><span className="name">{WRITERS[k]}</span><span className="t">{['لماذا تأخر قانون الضمان الجديد؟', 'الدينار والدولار: قراءة في قرار المركزي', 'الجامعات بين التصنيف والتمويل', 'المناخ ليس ترفاً'][i]}</span><small>{articles[i]?.summary || 'قراءة في القرار الأخير وأثره على المواطن والسوق…'}</small></span>
        </a>
      ))}
    </div>
  );
}

