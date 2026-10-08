'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminNav, { Denied } from '../components/AdminNav';
import { adminFetch, jsonInit, useStaff, EDITORS } from '../components/staff';
import { uploadImage } from '../components/upload';

// «بيانات الصفحة الرئيسية» (D-076, PLAN Q13): the desk keeps the homepage's data blocks current — weather alert,
// market rows, crossings, roads, service notices, royal court, cabinet decisions, obituaries, jobs, fact-checks,
// «في 60 ثانية». One generic editor driven by the field definitions the API sends (backend datablocks.ts).
// A block reaches readers only while fresh; the badge says whether it is live now.
type Kind = 'text' | 'long' | 'select' | 'url' | 'image' | 'date' | 'datetime' | 'bool';
interface Field { name: string; label: string; kind: Kind; options?: string[]; required?: boolean; max?: number; hint?: string }
interface Spec { type: string; label: string; hint: string; fields: Field[]; maxItems: number; minItems?: number; single?: boolean }
type Row = Record<string, string | boolean>;
interface BlockState { spec: Spec; items: Row[]; updatedAt: string | null; live: boolean }
interface Fx { day: string; usd: number; eur: number | null; gulf: { n: string; v: number }[] }

const OPT_AR: Record<string, string> = { ok: 'طبيعي', warn: 'ازدحام / تنبيه', bad: 'مغلق', up: '▲ ارتفاع', down: '▼ انخفاض', flat: '• ثابت' };
const when = (iso: string) => new Intl.DateTimeFormat('ar-JO-u-nu-latn', { timeZone: 'Asia/Amman', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
// <input type="datetime-local"> ↔ ISO in the browser's local time (the newsroom's: Amman)
const toLocal = (iso?: unknown) => { if (!iso) return ''; const d = new Date(String(iso)); if (isNaN(d.getTime())) return ''; const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const blankRow = (spec: Spec): Row => Object.fromEntries(spec.fields.map((f) => [f.name, f.kind === 'bool' ? false : f.kind === 'select' ? (f.options?.[0] ?? '') : '']));

function FieldInput({ f, value, onChange }: { f: Field; value: string | boolean; onChange: (v: string | boolean) => void }) {
  const [busy, setBusy] = useState(false);
  if (f.kind === 'bool') return <label className="chk"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {f.label}</label>;
  if (f.kind === 'select') return <select value={String(value)} onChange={(e) => onChange(e.target.value)} aria-label={f.label}>{f.options!.map((o) => <option key={o} value={o}>{OPT_AR[o] || o}</option>)}</select>;
  if (f.kind === 'long') return <textarea value={String(value)} onChange={(e) => onChange(e.target.value)} maxLength={f.max} rows={2} placeholder={f.hint || f.label} aria-label={f.label} />;
  if (f.kind === 'date') return <input type="date" value={value ? String(value).slice(0, 10) : ''} onChange={(e) => onChange(e.target.value ? `${e.target.value}T12:00:00+03:00` : '')} aria-label={f.label} />;
  if (f.kind === 'datetime') return <input type="datetime-local" value={toLocal(value)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')} aria-label={f.label} />;
  if (f.kind === 'image') {
    return (
      <span className="img">
        {value ? <img src={String(value)} alt="" /> : null}
        <label className="adm-logout">{busy ? '…' : value ? 'تغيير' : 'رفع صورة'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async (e) => { const fl = e.target.files?.[0]; if (!fl) return; setBusy(true); try { onChange(await uploadImage(fl)); } catch { /* the save reports it */ } setBusy(false); }} /></label>
        {value ? <button type="button" onClick={() => onChange('')}>إزالة</button> : null}
      </span>
    );
  }
  return <input value={String(value)} onChange={(e) => onChange(e.target.value)} maxLength={f.max || (f.kind === 'url' ? 300 : 200)} placeholder={f.hint || f.label} dir={f.kind === 'url' ? 'ltr' : undefined} aria-label={f.label} />;
}

function BlockCard({ b, onSaved }: { b: BlockState; onSaved: (n: BlockState) => void }) {
  const [rows, setRows] = useState<Row[]>(b.items.length ? b.items : []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const dirty = JSON.stringify(rows) !== JSON.stringify(b.items);
  const set = (i: number, k: string, v: string | boolean) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const move = (i: number, d: number) => setRows((r) => { const n = [...r]; const t = n[i + d]; if (!t) return r; n[i + d] = n[i]; n[i] = t; return n; });
  const save = async (items: Row[]) => {
    setBusy(true); setErr(''); setMsg('');
    const r = await adminFetch(`/api/admin/data/${b.spec.type}`, jsonInit('PUT', { items }));
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErr(j.error || 'تعذّر الحفظ.');
    else { onSaved({ ...b, items: j.data.items, updatedAt: j.data.updatedAt, live: j.data.live }); setRows(j.data.items); setMsg(items.length ? (j.data.live ? 'حُفظ — يظهر للقراء خلال دقيقة.' : 'حُفظ، لكنه غير معروض (منتهٍ).') : 'أُفرغ — اختفى من الموقع.'); }
    setBusy(false);
  };
  return (
    <section className={`st-card dblock ${b.live ? 'live' : ''}`}>
      <header>
        <h2>{b.spec.label}</h2>
        <span className={`badge ${b.live ? 'on' : ''}`}>{b.live ? 'معروض الآن' : b.items.length ? 'منتهٍ — غير معروض' : 'فارغ'}</span>
        {b.updatedAt && <small>آخر تحديث {when(b.updatedAt)}</small>}
      </header>
      <p className="adm-hint">{b.spec.hint}</p>
      {err && <div className="adm-err">{err}</div>}
      {msg && <div className="adm-ok">{msg}</div>}
      <ol className="rows">
        {rows.map((row, i) => (
          <li key={i}>
            <div className="fields">
              {b.spec.fields.map((f) => (
                <div key={f.name} className={`fld k-${f.kind}`}>
                  {f.kind !== 'bool' && <span className="lbl">{f.label}{f.required ? ' *' : ''}</span>}
                  <FieldInput f={f} value={row[f.name] ?? ''} onChange={(v) => set(i, f.name, v)} />
                </div>
              ))}
            </div>
            {!b.spec.single && (
              <div className="adm-ops">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="إلى الأعلى">▲</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="إلى الأسفل">▼</button>
                <button type="button" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>حذف</button>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="adm-ops">
        {rows.length < b.spec.maxItems && <button type="button" onClick={() => setRows((r) => [...r, blankRow(b.spec)])}>{rows.length ? '+ بند' : b.spec.single ? '+ إنشاء' : '+ أول بند'}</button>}
        <button type="button" className="adm-new" onClick={() => save(rows)} disabled={busy || !dirty || !rows.length}>{busy ? '…' : 'حفظ ونشر'}</button>
        {b.items.length > 0 && <button type="button" onClick={() => save([])} disabled={busy}>إفراغ</button>}
      </div>
    </section>
  );
}

export default function DataPage() {
  const { me, denied } = useStaff(EDITORS);
  const [blocks, setBlocks] = useState<BlockState[] | null>(null);
  const [fx, setFx] = useState<Fx | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try {
      const r = await adminFetch('/api/admin/data');
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || 'تعذّر التحميل.'); return; }
      setBlocks(j.data.blocks); setFx(j.data.fx);
    } catch { setErr('تعذّر الاتصال.'); }
  }, []);
  useEffect(() => { if (me && !denied) load(); }, [me, denied, load]);
  if (!me) return null;
  return (
    <div className="adm">
      <AdminNav me={me} />
      {denied ? <Denied /> : (
        <main className="adm-main adm-statsp adm-datap">
          <h1>بيانات الصفحة الرئيسية</h1>
          <p className="adm-hint">ما تحفظه هنا يظهر في الصفحة الرئيسية خلال دقيقة، ويختفي وحده حين يقدم (لكل قسم مدته). الأقسام الفارغة تختفي عند إيقاف «الأقسام التوضيحية».</p>
          {fx && <p className="adm-ok">أسعار الصرف تُحدَّث تلقائياً: الدولار {fx.usd.toFixed(3)} · اليورو {fx.eur?.toFixed(3)} · الريال السعودي {fx.gulf[0]?.v.toFixed(3)} دينار (ليوم {fx.day}).</p>}
          {err && <div className="adm-err">{err}</div>}
          {blocks?.map((b) => <BlockCard key={b.spec.type} b={b} onSaved={(n) => setBlocks((all) => all!.map((x) => (x.spec.type === n.spec.type ? n : x)))} />)}
        </main>
      )}
    </div>
  );
}
