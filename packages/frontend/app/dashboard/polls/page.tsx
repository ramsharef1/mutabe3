'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminNav, { Denied } from '../components/AdminNav';
import { adminFetch, jsonInit, useStaff, EDITORS, refreshHomepage } from '../components/staff';
import { votesAr } from '../../components/polls';

interface Opt { id: string; label: string; byline: string | null; note: string | null; votes: number }
interface P { id: string; slot: string; question: string; active: boolean; total: number; createdAt: string; options: Opt[] }

const SLOT_AR: Record<string, string> = { home: 'استطلاع الصفحة الرئيسية', debate: 'وجهان (مناظرة)' };
const blankOpts = (slot: string) => (slot === 'debate' ? [{ label: '', byline: '', note: '' }, { label: '', byline: '', note: '' }] : [{ label: 'نعم', byline: '', note: '' }, { label: 'لا', byline: '', note: '' }]);

// Polls (D-043 Stage 4): one active poll per slot; activating one closes the previous.
export default function Polls() {
  const { me, denied } = useStaff(EDITORS);
  const [rows, setRows] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [slot, setSlot] = useState('home');
  const [question, setQuestion] = useState('');
  const [opts, setOpts] = useState(blankOpts('home'));
  const [activate, setActivate] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await adminFetch('/api/admin/polls');
    if (r.ok) setRows((await r.json()).data || []); else setErr('تعذّر تحميل الاستطلاعات.');
    setLoading(false);
  }, []);
  useEffect(() => { if (me && !denied) load(); }, [me, denied, load]);

  const flash = (m: string) => { setOk(m); setErr(''); setTimeout(() => setOk(''), 3000); };
  const setActive = async (p: P, active: boolean) => {
    setBusy(true);
    const r = await adminFetch(`/api/admin/polls/${p.id}`, jsonInit('PUT', { active }));
    if (r.ok) { await load(); await refreshHomepage(); flash(active ? 'فُعّل الاستطلاع وأُغلق السابق' : 'أُغلق الاستطلاع'); } else setErr('تعذّر الحفظ.');
    setBusy(false);
  };
  const remove = async (p: P) => {
    if (!confirm(`حذف «${p.question}»${p.total ? ` مع ${votesAr(p.total)}` : ''}؟`)) return;
    setBusy(true);
    const r = await adminFetch(`/api/admin/polls/${p.id}`, { method: 'DELETE' });
    if (r.ok) { setRows((x) => x.filter((y) => y.id !== p.id)); if (p.active) await refreshHomepage(); } else setErr('تعذّر الحذف.');
    setBusy(false);
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await adminFetch('/api/admin/polls', jsonInit('POST', { slot, question, options: opts, active: activate }));
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setQuestion(''); setOpts(blankOpts(slot)); await load(); if (activate) await refreshHomepage(); flash('أُنشئ الاستطلاع'); } else setErr(j.error || 'تعذّر الإنشاء.');
    setBusy(false);
  };
  const pickSlot = (s: string) => { setSlot(s); setOpts(blankOpts(s)); };
  const setOpt = (i: number, k: 'label' | 'byline' | 'note', v: string) => setOpts((x) => x.map((o, j) => (j === i ? { ...o, [k]: v } : o)));

  return (
    <div className="adm">
      <AdminNav me={me} />
      {denied ? <Denied /> : (
        <main className="adm-main adm-editor">
          <div className="adm-head"><h1>الاستطلاعات</h1></div>
          {ok && <div className="adm-ok">{ok}</div>}
          {err && <div className="adm-err">{err}</div>}
          {loading ? <div className="adm-loading">جاري التحميل…</div> : (
            ['home', 'debate'].map((s) => (
              <section key={s} className="adm-card">
                <h2>{SLOT_AR[s]}</h2>
                {rows.filter((p) => p.slot === s).length === 0 && <p className="adm-note">لا استطلاعات بعد.</p>}
                {rows.filter((p) => p.slot === s).map((p) => (
                  <div key={p.id} className={`adm-poll ${p.active ? 'on' : ''}`}>
                    <div className="hd"><b>{p.question}</b>{p.active ? <span className="adm-badge s-published">ظاهر الآن</span> : <span className="adm-badge s-archived">مغلق</span>}</div>
                    <ul>{p.options.map((o) => <li key={o.id}><span>{o.label}{o.byline ? ` — ${o.byline}` : ''}</span><em>{o.votes} ({p.total ? Math.round((o.votes / p.total) * 100) : 0}%)</em></li>)}</ul>
                    <div className="adm-ops">
                      <small>{p.total ? votesAr(p.total) : 'لا أصوات'}</small>
                      {p.active ? <button type="button" disabled={busy} onClick={() => setActive(p, false)}>إغلاق</button> : <button type="button" className="ok" disabled={busy} onClick={() => setActive(p, true)}>إظهار</button>}
                      <button type="button" disabled={busy} onClick={() => remove(p)}>حذف</button>
                    </div>
                  </div>
                ))}
              </section>
            ))
          )}

          <form className="adm-card" onSubmit={create}>
            <h2>استطلاع جديد</h2>
            <div className="adm-row">
              <label>المكان
                <select value={slot} onChange={(e) => pickSlot(e.target.value)}>
                  <option value="home">استطلاع الصفحة الرئيسية</option>
                  <option value="debate">وجهان (رأيان متقابلان)</option>
                </select>
              </label>
            </div>
            <label>السؤال<input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} required /></label>
            {opts.map((o, i) => (
              <div key={i} className="adm-opt">
                <label>{slot === 'debate' ? `الرأي ${i === 0 ? 'الأول' : 'الثاني'} (عنوان قصير)` : `الخيار ${i + 1}`}<input value={o.label} onChange={(e) => setOpt(i, 'label', e.target.value)} maxLength={80} required /></label>
                {slot === 'debate' && (<>
                  <label>صاحب الرأي<input value={o.byline} onChange={(e) => setOpt(i, 'byline', e.target.value)} maxLength={80} /></label>
                  <label>الحجة (جملتان)<textarea value={o.note} onChange={(e) => setOpt(i, 'note', e.target.value)} maxLength={600} rows={2} /></label>
                </>)}
                {slot === 'home' && opts.length > 2 && <button type="button" className="adm-logout" onClick={() => setOpts((x) => x.filter((_, j) => j !== i))}>إزالة</button>}
              </div>
            ))}
            {slot === 'home' && opts.length < 6 && <button type="button" className="adm-logout" onClick={() => setOpts((x) => [...x, { label: '', byline: '', note: '' }])}>+ خيار</button>}
            <label className="adm-check"><input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} /> إظهاره فوراً مكان الاستطلاع الحالي</label>
            <button type="submit" className="adm-new" disabled={busy}>إنشاء</button>
          </form>
        </main>
      )}
    </div>
  );
}
