'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AdminNav, { Denied } from '../components/AdminNav';
import { adminFetch, useStaff, EDITORS } from '../components/staff';

// «الإحصاءات» (D-069): first-party numbers for the desk — reads per day (ArticleViewDaily, Amman days),
// the most-read pieces for today / 7 days / the period, sections and writers, the desk's daily output against
// the 10-a-day target (BIBLE F-13), and the newsletter, comments and ads counts. Editors and admins only.
interface ArticleRow { id: string; slug: string; title: string; kind: string; status: string; publishedAt: string | null; views: number; category: { name: string; slug: string }; author: { name: string } }
interface Stats {
  days: number; from: string; to: string; dataSince: string | null;
  reads: { total: number; prevTotal: number; today: number; daily: { day: string; views: number }[] };
  top: { day: ArticleRow[]; week: ArticleRow[]; period: ArticleRow[] };
  byCategory: { name: string; slug: string; views: number }[];
  byAuthor: { name: string; views: number; articles: number }[];
  output: { daily: { day: string; published: number; sponsored: number }[]; total: number };
  newsletter: { active: number; confirmed: number; unsubscribed: number };
  comments: { pending: number; approved: number; received: number };
  ads: { impressions: number; clicks: number };
}

const TARGET_PER_DAY = 10;
const n = (v: number) => v.toLocaleString('en-US');
const dayLabel = (d: string) => new Intl.DateTimeFormat('ar-JO-u-nu-latn', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));
const delta = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 100) : null);

/** Vertical bars, one per day, baseline-anchored; optional dashed target line. Hover shows the value. */
function DayBars({ rows, value, label, target, unit }: { rows: { day: string }[]; value: (r: any) => number; label: string; target?: number; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  // Draw at the container's real pixel width so axis text stays 11px on phones and desktops alike.
  const box = useRef<HTMLElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 180, padL = 40, padB = 22, padT = 10;
  const max = Math.max(1, target || 0, ...rows.map(value));
  const nice = (() => { const p = 10 ** Math.floor(Math.log10(max)); const m = max / p; return (m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; })();
  const step = (W - padL) / rows.length;
  const bw = Math.max(2, step - 2); // 2px gap between bars
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / nice);
  const ticks = [0, nice / 2, nice];
  const every = Math.ceil(rows.length / Math.max(2, Math.floor((W - padL) / 70))); // one date label per ~70px
  const h = hover !== null ? rows[hover] : null;
  return (
    <figure className="st-chart" ref={box} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} className="grid" />
            <text x={padL - 6} y={y(t) + 4} className="ax" textAnchor="end">{n(t)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const v = value(r), x = padL + i * step + 1, top = y(v), hgt = H - padB - top, rr = Math.min(4, hgt, bw / 2);
          return (
            <g key={r.day} onMouseEnter={() => setHover(i)}>
              <rect x={padL + i * step} y={padT} width={step} height={H - padT - padB} className="hit" />
              {v > 0 && <path className={`bar ${hover === i ? 'on' : ''}`} d={`M${x},${H - padB} V${top + rr} q0,-${rr} ${rr},-${rr} h${bw - 2 * rr} q${rr},0 ${rr},${rr} V${H - padB} Z`} />}
              {i % every === 0 && <text x={x + bw / 2} y={H - 6} className="ax" textAnchor="middle">{dayLabel(r.day)}</text>}
            </g>
          );
        })}
        {target !== undefined && <><line x1={padL} x2={W} y1={y(target)} y2={y(target)} className="target" /><text x={W - 2} y={y(target) - 4} className="ax" textAnchor="end">الهدف {target} يومياً</text></>}
        <line x1={padL} x2={W} y1={H - padB} y2={H - padB} className="base" />
      </svg>
      {h && <div className="tip" dir="rtl" style={{ left: `${((padL + (hover! + 0.5) * step) / W) * 100}%` }}><b>{n(value(h))}</b> {unit}<small>{dayLabel(h.day)}</small></div>}
      <details className="st-table"><summary>البيانات كجدول</summary>
        <table><thead><tr><th>اليوم</th><th>{unit}</th></tr></thead><tbody>{rows.map((r) => <tr key={r.day}><td>{r.day}</td><td>{n(value(r))}</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}

/** Horizontal magnitude bars with the value as text (never colour alone). */
function RankBars({ rows }: { rows: { name: string; views: number; note?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.views));
  if (!rows.length) return <p className="adm-hint">لا قراءات في هذه الفترة.</p>;
  return (
    <ol className="st-rank">
      {rows.map((r) => (
        <li key={r.name}>
          <span className="nm">{r.name}{r.note && <small>{r.note}</small>}</span>
          <span className="tr"><i style={{ width: `${(r.views / max) * 100}%` }} /></span>
          <b>{n(r.views)}</b>
        </li>
      ))}
    </ol>
  );
}

function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'up' | 'down' | 'warn' }) {
  return <div className={`st-tile ${tone || ''}`}><small>{label}</small><b>{value}</b>{note && <span>{note}</span>}</div>;
}

export default function StatsPage() {
  const { me, denied } = useStaff(EDITORS);
  const [days, setDays] = useState(30);
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState('');
  const [win, setWin] = useState<'day' | 'week' | 'period'>('week');

  const load = useCallback(async () => {
    setErr('');
    try {
      const r = await adminFetch(`/api/admin/stats?days=${days}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || 'تعذّر تحميل الإحصاءات.'); return; }
      setS(j.data);
    } catch { setErr('تعذّر الاتصال.'); }
  }, [days]);
  useEffect(() => { if (me && !denied) load(); }, [me, denied, load]);

  if (!me) return null;
  const d = s ? delta(s.reads.total, s.reads.prevTotal) : null;
  const perDay = s ? s.output.total / s.days : 0;
  const ctr = s && s.ads.impressions ? ((s.ads.clicks / s.ads.impressions) * 100).toFixed(2) : null;
  const top = s ? s.top[win] : [];
  return (
    <div className="adm">
      <AdminNav me={me} />
      {denied ? <Denied /> : (
        <main className="adm-main adm-statsp">
          <div className="st-head">
            <h1>الإحصاءات</h1>
            <div className="seg" role="group" aria-label="الفترة">
              {[7, 30, 90].map((v) => <button key={v} type="button" aria-pressed={days === v} onClick={() => setDays(v)}>{v} يوماً</button>)}
            </div>
          </div>
          <p className="adm-hint">قراءات محسوبة على خادم الموقع: لا تُحسب الروبوتات ولا تكرار القراءة نفسها خلال 30 دقيقة. الأيام بتوقيت عمّان.
            {s?.dataSince ? ` العدّ اليومي بدأ في ${s.dataSince}.` : ' العدّ اليومي يبدأ مع أول قراءة بعد هذا التحديث.'}</p>
          {err && <div className="adm-err">{err}</div>}
          {!s ? (!err && <p className="adm-hint">جاري التحميل…</p>) : (
            <>
              <div className="st-tiles">
                <Tile label="قراءات اليوم" value={n(s.reads.today)} />
                <Tile label={`قراءات ${s.days} يوماً`} value={n(s.reads.total)} note={d === null ? 'لا فترة سابقة للمقارنة' : `${d >= 0 ? '+' : ''}${d}% عن الفترة السابقة`} tone={d === null ? undefined : d >= 0 ? 'up' : 'down'} />
                <Tile label="مواد منشورة" value={n(s.output.total)} note={`${perDay.toFixed(1)} يومياً · الهدف ${TARGET_PER_DAY}`} tone={perDay >= TARGET_PER_DAY ? 'up' : 'warn'} />
                <Tile label="مشتركو النشرة" value={n(s.newsletter.active)} note={`+${n(s.newsletter.confirmed)} · −${n(s.newsletter.unsubscribed)} في الفترة`} />
                <Tile label="تعليقات بانتظار المراجعة" value={n(s.comments.pending)} note={`${n(s.comments.received)} وصلت · ${n(s.comments.approved)} قُبلت`} tone={s.comments.pending ? 'warn' : undefined} />
                <Tile label="مشاهدات الإعلانات" value={n(s.ads.impressions)} note={ctr ? `${n(s.ads.clicks)} نقرة · ${ctr}%` : 'لا حملات مباشرة'} />
              </div>

              <section className="st-card">
                <h2>القراءات يومياً</h2>
                <DayBars rows={s.reads.daily} value={(r) => r.views} label="عدد القراءات في كل يوم" unit="قراءة" />
              </section>

              <section className="st-card">
                <h2>الأكثر قراءة</h2>
                <div className="seg" role="group" aria-label="نافذة الأكثر قراءة">
                  {([['day', 'اليوم'], ['week', '7 أيام'], ['period', `${s.days} يوماً`]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={win === k} onClick={() => setWin(k)}>{l}</button>)}
                </div>
                {top.length === 0 ? <p className="adm-hint">لا قراءات في هذه النافذة بعد.</p> : (
                  <table className="st-top">
                    <thead><tr><th>#</th><th>المادة</th><th>القسم</th><th>الكاتب</th><th>القراءات</th></tr></thead>
                    <tbody>{top.map((a, i) => (
                      <tr key={a.id}>
                        <td>{i + 1}</td>
                        <td><a href={`/article/${encodeURIComponent(a.slug || a.id)}`} target="_blank" rel="noopener">{a.title}</a>{a.kind === 'SPONSORED' && <span className="tag">إعلان</span>}</td>
                        <td>{a.category.name}</td><td>{a.author.name}</td><td className="num">{n(a.views)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </section>

              <div className="st-two">
                <section className="st-card"><h2>الأقسام</h2><RankBars rows={s.byCategory} /></section>
                <section className="st-card"><h2>الكتّاب</h2><RankBars rows={s.byAuthor.map((a) => ({ name: a.name, views: a.views, note: `${a.articles} مادة مقروءة` }))} /></section>
              </div>

              <section className="st-card">
                <h2>إنتاج التحرير يومياً</h2>
                <DayBars rows={s.output.daily} value={(r) => r.published} label="عدد المواد المنشورة في كل يوم مقارنة بهدف عشر مواد" target={TARGET_PER_DAY} unit="مادة" />
              </section>
            </>
          )}
        </main>
      )}
    </div>
  );
}
