'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AdminNav, { Denied } from '../components/AdminNav';
import { adminFetch, jsonInit, useStaff, EDITORS } from '../components/staff';
import SmtpSettings from './SmtpSettings';

interface Issue { id: string; subject: string; status: string; auto: boolean; edition: string | null; recipients: number; sent: number; failed: number; lastError: string | null; createdAt: string; sentAt: string | null; articleIds: string[] }
interface Mail { mode: string; source: string; host: string | null; user: string | null; from: string; domain: string; spf: boolean; dmarc: boolean; error: string | null }

const SOURCE_AR: Record<string, string> = { 'dry-run': 'وضع التجربة (لا يُرسل شيء)', dashboard: 'حساب البريد المحدد هنا', env: 'إعدادات ملف الخادم', local: 'خادم الموقع نفسه' };
interface Info { stats: Record<string, number>; issues: Issue[]; mail: Mail; auto: { enabled: boolean; hour: number; lastDate?: string } }
interface A { id: string; title: string; status: string; publishedAt?: string | null }
interface Sub { email: string; status: string; categories: string[]; source: string | null; subscribedAt: string }

const EDITIONS = ['سياسة', 'اقتصاد', 'رياضة', 'فلسطين'];
const ST_AR: Record<string, string> = { draft: 'مسودة', sending: 'قيد الإرسال', sent: 'أُرسل', failed: 'فشل' };
const fmt = (d?: string | null) => { if (!d) return ''; try { return new Date(d).toLocaleString('ar-JO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

// Newsletter (D-043 Stage 4): subscribers, compose → test → send, automatic morning digest.
export default function Newsletter() {
  const { me, denied } = useStaff(EDITORS);
  const [info, setInfo] = useState<Info | null>(null);
  const [articles, setArticles] = useState<A[]>([]);
  const [subject, setSubject] = useState('');
  const [intro, setIntro] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [edition, setEdition] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const [n, a] = await Promise.all([adminFetch('/api/admin/newsletter'), adminFetch('/api/admin/articles')]);
    if (n.ok) setInfo((await n.json()).data); else setErr('تعذّر تحميل النشرة.');
    if (a.ok) setArticles(((await a.json()).data || []).filter((x: A) => x.status === 'PUBLISHED').slice(0, 40));
  }, []);
  useEffect(() => { if (me && !denied) load(); }, [me, denied, load]);

  // While an issue is sending, refresh progress every 3 seconds.
  useEffect(() => {
    const sending = info?.issues.some((i) => i.status === 'sending');
    if (sending && !timer.current) timer.current = setInterval(load, 3000);
    if (!sending && timer.current) { clearInterval(timer.current); timer.current = null; }
    return () => { if (timer.current && !sending) { clearInterval(timer.current); timer.current = null; } };
  }, [info, load]);

  const flash = (m: string) => { setOk(m); setErr(''); setTimeout(() => setOk(''), 5000); };
  const fail = async (r: Response, f: string) => setErr((await r.json().catch(() => ({}))).error || f);
  const toggle = (id: string) => setPicked((x) => (x.includes(id) ? x.filter((y) => y !== id) : x.length >= 12 ? x : [...x, id]));

  const create = async () => {
    setBusy(true); setErr('');
    const r = await adminFetch('/api/admin/newsletter/issues', jsonInit('POST', { subject, intro, articleIds: picked, edition: edition || null }));
    if (r.ok) { const j = await r.json(); setSubject(''); setIntro(''); setPicked([]); await load(); flash(`حُفظ العدد كمسودة — سيصل إلى ${j.recipients} مشتركاً عند الإرسال.`); } else await fail(r, 'تعذّر الحفظ.');
    setBusy(false);
  };
  const test = async (i: Issue) => {
    setBusy(true); setErr('');
    const r = await adminFetch(`/api/admin/newsletter/issues/${i.id}/test`, { method: 'POST' });
    if (r.ok) flash(`أُرسلت نسخة تجريبية إلى ${(await r.json()).to}. افحص صندوق الوارد والبريد المزعج.`); else await fail(r, 'تعذّر الإرسال التجريبي.');
    setBusy(false);
  };
  const send = async (i: Issue) => {
    const g = await adminFetch(`/api/admin/newsletter/issues/${i.id}`);
    const n = g.ok ? (await g.json()).recipients : '?';
    if (!confirm(`إرسال «${i.subject}» إلى ${n} مشتركاً؟ لا يمكن التراجع بعد البدء.`)) return;
    setBusy(true); setErr('');
    const r = await adminFetch(`/api/admin/newsletter/issues/${i.id}/send`, { method: 'POST' });
    if (r.ok) { flash('بدأ الإرسال — يتحدّث التقدّم هنا تلقائياً.'); await load(); } else await fail(r, 'تعذّر بدء الإرسال.');
    setBusy(false);
  };
  const drop = async (i: Issue) => {
    if (!confirm('حذف هذه المسودة؟')) return;
    const r = await adminFetch(`/api/admin/newsletter/issues/${i.id}`, { method: 'DELETE' });
    if (r.ok) load(); else await fail(r, 'تعذّر الحذف.');
  };
  const saveAuto = async (enabled: boolean, hour: number) => {
    setBusy(true); setErr('');
    const r = await adminFetch('/api/admin/newsletter/auto', jsonInit('PUT', { enabled, hour }));
    if (r.ok) { await load(); flash(enabled ? `النشرة الصباحية التلقائية مفعّلة الساعة ${hour}:00 بتوقيت عمّان.` : 'أُوقفت النشرة التلقائية.'); } else await fail(r, 'تعذّر الحفظ.');
    setBusy(false);
  };
  const loadSubs = async () => {
    const r = await adminFetch('/api/admin/newsletter/subscribers');
    if (r.ok) setSubs((await r.json()).data || []); else await fail(r, 'تعذّر تحميل المشتركين.');
  };
  const exportCsv = () => {
    if (!subs) return;
    const rows = [['email', 'status', 'editions', 'source', 'subscribedAt'], ...subs.map((s) => [s.email, s.status, s.categories.join('|'), s.source || '', s.subscribedAt])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `mutabe3-subscribers-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const mail = info?.mail;
  const deliverable = mail && mail.mode === 'smtp' && mail.spf;

  return (
    <div className="adm">
      <AdminNav me={me} />
      {denied ? <Denied /> : !info ? <main className="adm-main"><div className="adm-loading">جاري التحميل…</div>{err && <div className="adm-err">{err}</div>}</main> : (
        <main className="adm-main adm-editor">
          <div className="adm-head"><h1>النشرة البريدية</h1></div>
          {ok && <div className="adm-ok">{ok}</div>}
          {err && <div className="adm-err">{err}</div>}

          <div className="adm-stats">
            <div><b>{info.stats.active || 0}</b><small>مشترك نشط</small></div>
            <div><b>{info.stats.unsubscribed || 0}</b><small>ألغوا الاشتراك</small></div>
            <div><b>{info.issues.filter((i) => i.status === 'sent').length}</b><small>عدد مُرسل</small></div>
          </div>

          {mail && (
            <p className="adm-note">
              الإرسال الحالي عبر: <b>{SOURCE_AR[mail.source] || mail.source}</b>
              {mail.host && <> · <span dir="ltr">{mail.host}</span></>}
              {mail.user && <> · <span dir="ltr">{mail.user}</span></>}
              {' '}· المرسِل: <span dir="ltr">{mail.from}</span>
            </p>
          )}
          {mail?.error && <div className="adm-err">{mail.error}</div>}
          {!deliverable && (
            <div className="adm-err">
              {mail?.mode === 'dry-run' ? 'وضع التجربة مفعّل: الرسائل لا تُرسل فعلياً.' : <>
                النطاق <b dir="ltr">{mail?.domain}</b> لا ينشر سجل SPF{mail?.dmarc ? '' : ' ولا DMARC'}، لذلك ستذهب الرسائل غالباً إلى البريد المزعج أو تُرفض لدى Gmail.
                أضف سجلات البريد في DNS ثم جرّب «إرسال تجريبي» قبل الإرسال للمشتركين.
              </>}
            </div>
          )}

          {me?.role === 'ADMIN' && <SmtpSettings onSaved={load} />}

          <section className="adm-card">
            <h2>عدد جديد</h2>
            <label>عنوان الرسالة<input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} placeholder="مثال: أبرز أخبار اليوم" /></label>
            <label>مقدمة قصيرة (اختياري)<textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} maxLength={1500} /></label>
            <label>المشتركون
              <select value={edition} onChange={(e) => setEdition(e.target.value)}>
                <option value="">كل المشتركين النشطين</option>
                {EDITIONS.map((x) => <option key={x} value={x}>مشتركو نشرة «{x}» ومن لم يختر نشرة</option>)}
              </select>
            </label>
            <span className="adm-lbl">المقالات ({picked.length}/12) — بترتيب الاختيار</span>
            <ul className="adm-pickarts">
              {articles.map((a) => (
                <li key={a.id}><label className="adm-check"><input type="checkbox" checked={picked.includes(a.id)} onChange={() => toggle(a.id)} />{picked.includes(a.id) && <em>{picked.indexOf(a.id) + 1}</em>}{a.title}</label></li>
              ))}
            </ul>
            <button type="button" className="adm-new" disabled={busy || !subject.trim() || !picked.length} onClick={create}>حفظ كمسودة</button>
          </section>

          <section className="adm-card">
            <h2>الأعداد</h2>
            {info.issues.length === 0 ? <p className="adm-note">لا أعداد بعد.</p> : (
              <div className="adm-scroll">
                <table className="adm-table">
                  <thead><tr><th>العنوان</th><th>الحالة</th><th className="adm-hide-sm">التاريخ</th><th>الإرسال</th><th>إجراءات</th></tr></thead>
                  <tbody>
                    {info.issues.map((i) => (
                      <tr key={i.id}>
                        <td className="adm-title">{i.subject}{i.auto && <small className="adm-sub">تلقائي</small>}{i.edition && <small className="adm-sub">نشرة {i.edition}</small>}</td>
                        <td><span className={`adm-badge s-${i.status === 'sent' ? 'published' : i.status === 'failed' ? 'archived' : i.status === 'sending' ? 'scheduled' : 'draft'}`}>{ST_AR[i.status] || i.status}</span></td>
                        <td className="adm-date adm-hide-sm">{fmt(i.sentAt || i.createdAt)}</td>
                        <td>{i.status === 'draft' ? '—' : `${i.sent}/${i.recipients}${i.failed ? ` · فشل ${i.failed}` : ''}`}{i.lastError && <small className="adm-sub" title={i.lastError}>آخر خطأ: {i.lastError.slice(0, 60)}</small>}</td>
                        <td className="adm-ops">
                          {['draft', 'failed'].includes(i.status) && <button type="button" disabled={busy} onClick={() => test(i)}>إرسال تجريبي لي</button>}
                          {['draft', 'failed'].includes(i.status) && <button type="button" className="ok" disabled={busy} onClick={() => send(i)}>إرسال للمشتركين</button>}
                          {i.status === 'draft' && <button type="button" disabled={busy} onClick={() => drop(i)}>حذف</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="adm-card">
            <h2>النشرة الصباحية التلقائية</h2>
            <p className="adm-note">كل يوم في الساعة المحددة تُرسل أبرز 8 مقالات نُشرت خلال آخر 24 ساعة إلى كل المشتركين النشطين. {me?.role !== 'ADMIN' && 'تفعيلها من صلاحية المدير.'}</p>
            <div className="adm-inline">
              <label className="adm-check"><input type="checkbox" checked={info.auto.enabled} disabled={busy || me?.role !== 'ADMIN'} onChange={(e) => saveAuto(e.target.checked, info.auto.hour)} /> مفعّلة</label>
              <select value={info.auto.hour} disabled={busy || me?.role !== 'ADMIN'} onChange={(e) => saveAuto(info.auto.enabled, Number(e.target.value))} aria-label="ساعة الإرسال">
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00 بتوقيت عمّان</option>)}
              </select>
            </div>
            {info.auto.lastDate && <small className="adm-sub">آخر إرسال تلقائي: {info.auto.lastDate}</small>}
          </section>

          {me?.role === 'ADMIN' && (
            <section className="adm-card">
              <h2>المشتركون</h2>
              {!subs ? <button type="button" className="adm-logout" onClick={loadSubs}>عرض قائمة المشتركين</button> : (<>
                <div className="adm-inline"><span>{subs.length} سجلاً</span><button type="button" className="adm-logout" onClick={exportCsv} disabled={!subs.length}>تصدير CSV</button></div>
                <div className="adm-scroll">
                  <table className="adm-table">
                    <thead><tr><th>البريد</th><th>الحالة</th><th className="adm-hide-sm">النشرات</th><th className="adm-hide-sm">المصدر</th><th>التاريخ</th></tr></thead>
                    <tbody>{subs.slice(0, 300).map((s) => <tr key={s.email}><td dir="ltr">{s.email}</td><td>{s.status === 'active' ? 'نشط' : 'ألغى'}</td><td className="adm-hide-sm">{s.categories.join('، ') || 'الكل'}</td><td className="adm-hide-sm">{s.source || '—'}</td><td className="adm-date">{fmt(s.subscribedAt)}</td></tr>)}</tbody>
                  </table>
                </div>
              </>)}
            </section>
          )}
        </main>
      )}
    </div>
  );
}
