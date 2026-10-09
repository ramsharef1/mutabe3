'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Article, Img, Ico, ago, Chip, WRITERS, face } from '../site';
import { MARKET, PICKS, OBITS, SIXTY, BreakingItem } from '../feeds';
import { usePoll, pct, votesAr, PollOpt } from '../polls';
import { PushToggle } from '../push';
import { type Row, type Fx } from '../../lib/data';
import { useNow, useBrowserValue } from '../hooks';

const link = (a: Article) => `/article/${a.id}`;

/* ---- C1 breaking bar: only when an editor sets one in /dashboard/homepage ---- */
export function BreakingBar({ item }: { item?: BreakingItem | null }) {
  const [open, setOpen] = useState(true);
  if (!item || !open) return null;
  return (
    <div className="brk" role="alert">
      <span className="live"><i />عاجل</span>
      <a href={item.href}><b>{item.title}</b></a>
      <span className="tm" suppressHydrationWarning>{Ico.clock}{ago(item.at)}</span>
      <a className="go" href={item.href}>تابع التغطية ›</a>
      <PushToggle compact />
      <button type="button" className="x" onClick={() => setOpen(false)} aria-label="إخفاء">×</button>
    </div>
  );
}

/* ---- B7 ticker: red «عاجل» when breaking, calm «آخر الأخبار» otherwise; pause button; reduced-motion safe ---- */
export function Ticker({ items, hot = false }: { items: Article[]; hot?: boolean }) {
  const [paused, setPaused] = useState(false);
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
const fmtPct = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)}%`;

/** Live dollar/euro (ExchangeRate-API) + the desk's rows (gold, petrol, ASE, inflation); demo values without either (D-076). */
export function MarketStrip({ updated, fx, rows }: { updated: string; fx?: Fx | null; rows?: Row[] }) {
  const live = fx || rows?.length;
  const list = live
    ? [
        ...(fx ? [{ n: 'دولار / دينار', v: fx.usd.toFixed(3), d: 0, s: 'ثابت' }] : []),
        ...(fx?.eur ? [{ n: 'يورو / دينار', v: fx.eur.toFixed(3), d: fx.eurChangePct ? Math.sign(fx.eurChangePct) : 0, s: fx.eurChangePct != null ? fmtPct(fx.eurChangePct) : '—' }] : []),
        ...(rows || []).map((r) => ({ n: String(r.n), v: String(r.v), d: r.d === 'up' ? 1 : r.d === 'down' ? -1 : 0, s: String(r.s || '') })),
      ]
    : MARKET;
  return (
    <div className="mkt" aria-label="لوحة الاقتصاد">
      <a className="mlb" href="/category/economy">لوحة الاقتصاد <small>تحديث {updated}</small></a>
      <ul>
        {list.map((m) => (
          <li key={m.n}><small>{m.n}</small><b>{m.v}<span className={m.d > 0 ? 'up' : m.d < 0 ? 'dn' : 'fl'}>{m.d > 0 ? '▲' : m.d < 0 ? '▼' : '•'} {m.s}</span></b></li>
        ))}
      </ul>
      {fx && <a className="mkt-src" href={fx.source.url} rel="noopener" target="_blank">العملات: {fx.source.name}</a>}
    </div>
  );
}

/* ---- C11 since your last visit (localStorage) ---- */
// D-085: the previous visit is read once per page load (module scope), before this visit is recorded below.
let lastVisitAtLoad: string | null | undefined;
export function Missed({ articles }: { articles: Article[] }) {
  const raw = useBrowserValue(() => (lastVisitAtLoad === undefined ? (lastVisitAtLoad = localStorage.getItem('lastVisit')) : lastVisitAtLoad), null);
  const now = useNow();
  const state = useMemo(() => {
    if (!raw || now === null) return null;
    const since = new Date(parseInt(raw, 10));
    const list = articles.filter((a) => a.publishedAt && new Date(a.publishedAt) > since);
    return list.length >= 2 && now - since.getTime() > 30 * 60000 ? { since, list } : null;
  }, [raw, now, articles]);
  useEffect(() => { try { localStorage.setItem('lastVisit', String(Date.now())); } catch {} }, []);
  const [dismissed, setDismissed] = useState(false);
  if (!state || dismissed) return null;
  const when = new Intl.DateTimeFormat('ar-JO-u-nu-latn', { weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(state.since);
  return (
    <div className="missed">
      <b>شو فاتك؟</b>
      <span>نشرنا <strong>{state.list.length} خبراً</strong> منذ زيارتك الأخيرة ({when})</span>
      <span className="n5">{state.list.slice(0, 3).map((a) => <a key={a.id} href={link(a)}>{a.title}</a>)}</span>
      <button type="button" className="x" onClick={() => setDismissed(true)} aria-label="إخفاء">×</button>
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

export function PicksBox({ articles, picks, rail = false }: { articles: Article[]; picks?: Article[]; rail?: boolean }) {
  // Curated list from /dashboard/homepage when set; otherwise the built-in defaults.
  const list = picks && picks.length ? picks : (PICKS.map((id) => articles.find((a) => a.id === id)).filter(Boolean) as Article[]);
  if (!list.length) return null;
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

export function ObitsBox({ items }: { items?: Row[] }) {
  const [q, setQ] = useState('');
  const src = (items as typeof OBITS | undefined) ?? OBITS;
  const list = src.filter((o) => !q || o.n.includes(q) || o.a.includes(q) || o.gov.includes(q)).slice(0, 4);
  return (
    <div className="box obits">
      <div className="hd"><a href="/category/obituaries">وفيات</a><i /></div>
      <form className="obsearch" onSubmit={(e) => e.preventDefault()}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم المتوفى أو العائلة أو المنطقة…" aria-label="بحث في الوفيات" />
        <button type="submit">بحث</button>
      </form>
      <ul>
        {list.length ? list.map((o) => <li key={o.n}>{items ? <b>{o.n} في ذمة الله</b> : <a href="/category/obituaries">{o.n} في ذمة الله</a>}<span className="tm">العزاء: {o.a}{o.h ? ` · ${o.h}` : ''} · {o.gov}</span></li>) : <li className="none">لا نتائج لـ «{q}»</li>}
      </ul>
      {!items && <a className="all" href="/category/obituaries">كل الوفيات ›</a>}
    </div>
  );
}

/* ---- C3 most read with time tabs ---- */
export function MostRead({ articles, at }: { articles: Article[]; at: number }) {
  const now = useNow() ?? at; // D-085: server time until hydrated, then the shared clock
  const [tab, setTab] = useState(0);
  const sorted = [...articles].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
  // Real view counts (POST /api/articles/:id/view). Tabs narrow by publish window and
  // fall back to all-time when a window has too few items to rank.
  const WINDOWS = [24 * 3600e3, 7 * 24 * 3600e3, Infinity];
  const inWin = sorted.filter((a) => a.publishedAt && now - new Date(a.publishedAt).getTime() < WINDOWS[tab]);
  const list = (inWin.length >= 5 ? inWin : sorted).slice(0, 5);
  return (
    <div className="mostread">
      <div className="tabs" role="tablist">
        {['اليوم', 'الأسبوع', 'الكل'].map((t, i) => <button type="button" role="tab" aria-selected={tab === i} key={t} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{t}</button>)}
      </div>
      <ol>{list.map((a, i) => <li key={a.id}><span className="rank">{i + 1}</span><a href={link(a)}>{a.title}<span className="tm">{Ico.eye}{a.viewsCount || 0} مشاهدة</span></a></li>)}</ol>
    </div>
  );
}

/* ---- C5 في 60 ثانية ---- */
const SIXTY_K = ['ماذا حدث', 'لماذا يهم', 'ما التالي'];
export function Sixty({ items }: { items?: Row[] }) {
  const list = items ? items.map((r, i) => ({ k: SIXTY_K[i] || '', b: String(r.b), p: String(r.p) })) : SIXTY;
  return (
    <div className="sixty">
      {list.map((c, i) => <div className="c" key={c.k}><span className="no" aria-hidden>{i + 1}</span><small>{c.k}</small><b>{c.b}</b><p>{c.p}</p></div>)}
    </div>
  );
}

/* ---- A8 poll, functional (localStorage) ---- */
/* ---- community poll: editor-managed, votes persist on the server (D-043 Stage 4) ---- */
export function Poll() {
  const { poll, mine, vote, err } = usePoll('home');
  if (poll === undefined) return <fieldset className="poll" aria-busy="true"><legend><b>استطلاع المتابع</b></legend><small>جاري التحميل…</small></fieldset>;
  if (!poll) return <fieldset className="poll"><legend><b>استطلاع المتابع</b></legend><small>لا يوجد استطلاع مفتوح حالياً.</small></fieldset>;
  const shown = mine !== null;
  return (
    <fieldset className="poll">
      <legend><b>{poll.question}</b></legend>
      {poll.options.map((o) => (
        <button type="button" key={o.id} className={`opt ${mine === o.id ? 'me' : ''}`} onClick={() => vote(o.id)} disabled={shown}>
          <span>{o.label}</span>
          {shown && <><span className="bar" style={{ width: `${pct(o.votes, poll.total)}%` }} /><em>{pct(o.votes, poll.total)}%</em></>}
        </button>
      ))}
      <small>{poll.total ? votesAr(poll.total) : 'كن أول من يصوّت'} · {shown ? 'شكراً لمشاركتك' : 'اضغط للتصويت'}</small>
      {err && <small className="perr" role="status">{err}</small>}
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
/* ---- C9 «وجهان» debate: editor-managed two-sided poll; votes persist on the server (D-043 Stage 4) ---- */
const SIDE_COL = ['#1b5e20', '#c62828'];
export function Debate() {
  const { poll, mine, vote, err } = usePoll('debate');
  if (poll === undefined) return <div className="debate loadingbox" aria-busy="true" />;
  if (!poll || poll.options.length < 2) return null;
  const [a, b] = poll.options;
  const pa = pct(a.votes, poll.total);
  const side = (o: PollOpt, k: number) => (
    <div className="side2">
      <span className="au-init" aria-hidden>{(o.byline || o.label).trim()[0]}</span>
      <div>
        {o.byline && <span className="name">{o.byline}</span>}
        <span className="pos" style={{ background: SIDE_COL[k] }}>{o.label}</span>
        {o.note && <p>{o.note}</p>}
        <button type="button" onClick={() => vote(o.id)} disabled={!!mine} className={mine === o.id ? 'on' : ''}>{mine === o.id ? 'صوّتَّ لهذا الرأي' : 'أؤيد هذا الرأي'}</button>
      </div>
    </div>
  );
  return (
    <div className="debate">
      <div className="q">وجهان: {poll.question}</div>
      {side(a, 0)}
      <div className="vs">
        <b>VS</b>
        <span className="bar" style={{ background: poll.total ? `linear-gradient(${SIDE_COL[0]} 0 ${pa}%, ${SIDE_COL[1]} ${pa}%)` : 'var(--line)' }} />
        <small>{poll.total ? `${pa}% · ${100 - pa}% · ${votesAr(poll.total)}` : 'لا أصوات بعد'}</small>
      </div>
      {side(b, 1)}
      {err && <small className="perr" role="status">{err}</small>}
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

