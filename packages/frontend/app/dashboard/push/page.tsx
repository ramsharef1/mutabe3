'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminNav, { Denied } from '../components/AdminNav';
import { adminFetch, jsonInit, useStaff, EDITORS } from '../components/staff';

// «تنبيهات المتصفح» (D-072): web push for عاجل. Admins switch it on (readers then see «فعّل تنبيهات عاجل» in
// the footer and the عاجل bar — nobody is prompted automatically). Editors send each alert by hand, at most
// one per 10 minutes, with a confirm step; every send is audited and listed below with its delivery counts.
interface Send { id: string; title: string; url: string; total: number; sent: number; failed: number; removed: number; status: string; createdAt: string }
interface Status { enabled: boolean; subscribers: number; recent: Send[]; gapMinutes: number }

const when = (iso: string) => new Intl.DateTimeFormat('ar-JO-u-nu-latn', { timeZone: 'Asia/Amman', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));

export default function PushPage() {
  const { me, denied } = useStaff(EDITORS);
  const admin = me?.role === 'ADMIN';
  const [st, setSt] = useState<Status | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('/');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([adminFetch('/api/admin/push'), adminFetch('/api/admin/homepage')]);
      const pj = await p.json().catch(() => ({}));
      if (!p.ok) { setErr(pj.error || 'تعذّر التحميل.'); return; }
      setSt(pj.data);
      // pre-fill from the current breaking headline the first time
      const hj = await h.json().catch(() => ({}));
      const b = hj?.data?.setting?.breaking;
      if (b) { setTitle((t) => t || b.title); setUrl((u) => (u === '/' ? b.href || '/' : u)); }
    } catch { setErr('تعذّر الاتصال.'); }
  }, []);
  useEffect(() => { if (me && !denied) load(); }, [me, denied, load]);
  // refresh the delivery counts while a send is running
  useEffect(() => {
    if (!st?.recent.some((r) => r.status === 'sending')) return;
    const t = setTimeout(load, 3000);
    return () => clearTimeout(t);
  }, [st, load]);

  const toggle = async () => {
    if (!st) return;
    setBusy(true); setErr(''); setMsg('');
    const r = await adminFetch('/api/admin/push', jsonInit('PUT', { enabled: !st.enabled }));
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErr(j.error || 'تعذّر الحفظ.');
    else setMsg(j.data.enabled ? 'التنبيهات مفعّلة — يظهر زر «فعّل تنبيهات عاجل» للقراء.' : 'التنبيهات متوقفة — اختفى الزر من الموقع.');
    setBusy(false); load();
  };

  const send = async () => {
    setBusy(true); setErr(''); setMsg(''); setConfirm(false);
    const r = await adminFetch('/api/admin/push/send', jsonInit('POST', { title, url }));
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErr(j.error || 'تعذّر الإرسال.');
    else setMsg(`بدأ الإرسال إلى ${j.data.total} متصفحاً.`);
    setBusy(false); load();
  };

  if (!me) return null;
  return (
    <div className="adm">
      <AdminNav me={me} />
      {denied ? <Denied /> : (
        <main className="adm-main adm-editor adm-pushp" style={{ maxWidth: 760 }}>
          <h1>تنبيهات المتصفح للعاجل</h1>
          <p className="adm-hint">يشترك القارئ بنفسه من زر «فعّل تنبيهات عاجل» أسفل الموقع وفي شريط العاجل — لا يُسأل أحد تلقائياً. على iPhone تعمل التنبيهات فقط بعد إضافة الموقع إلى الشاشة الرئيسية.</p>
          {msg && <div className="adm-ok">{msg}</div>}
          {err && <div className="adm-err">{err}</div>}
          {st && (
            <>
              <div className="st-tiles" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
                <div className="st-tile"><small>الحالة</small><b>{st.enabled ? 'مفعّلة' : 'متوقفة'}</b>
                  {admin ? <span><button type="button" className="adm-logout" onClick={toggle} disabled={busy}>{st.enabled ? 'إيقاف التنبيهات' : 'تشغيل التنبيهات'}</button></span> : <span>يشغّلها المدير</span>}
                </div>
                <div className="st-tile"><small>متصفحات مشتركة</small><b>{st.subscribers.toLocaleString('en-US')}</b><span>تُحذف الاشتراكات المنتهية تلقائياً</span></div>
              </div>

              <section className="st-card">
                <h2>إرسال تنبيه</h2>
                <label>نص التنبيه<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="الخبر العاجل في جملة واحدة" /></label>
                <label>الرابط عند الضغط<input value={url} onChange={(e) => setUrl(e.target.value)} maxLength={300} dir="ltr" placeholder="/article/…" /></label>
                <p className="adm-hint">يُرسل بعنوان «عاجل · المتابع». تنبيه واحد كل {st.gapMinutes} دقائق كحد أقصى.</p>
                {confirm
                  ? <div className="adm-ops"><b>إرسال إلى {st.subscribers} متصفحاً الآن؟</b> <button type="button" className="adm-new" onClick={send} disabled={busy}>نعم، أرسل</button> <button type="button" onClick={() => setConfirm(false)}>تراجع</button></div>
                  : <button type="button" className="adm-new" onClick={() => { setErr(''); setMsg(''); setConfirm(true); }} disabled={busy || !st.enabled || title.trim().length < 5}>إرسال التنبيه</button>}
                {!st.enabled && <p className="adm-hint">التنبيهات متوقفة — {admin ? 'شغّلها أعلاه أولاً.' : 'اطلب من المدير تشغيلها.'}</p>}
              </section>

              <section className="st-card">
                <h2>آخر التنبيهات</h2>
                {st.recent.length === 0 ? <p className="adm-hint">لم يُرسل أي تنبيه بعد.</p> : (
                  <table className="st-top">
                    <thead><tr><th>الوقت</th><th>النص</th><th>وصل</th><th>فشل</th><th>اشتراكات أُزيلت</th></tr></thead>
                    <tbody>{st.recent.map((r) => (
                      <tr key={r.id}>
                        <td>{when(r.createdAt)}</td>
                        <td>{r.title}{r.status === 'sending' && <span className="tag">جارٍ الإرسال</span>}</td>
                        <td className="num">{r.sent} / {r.total}</td><td className="num">{r.failed}</td><td className="num">{r.removed}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </section>
            </>
          )}
        </main>
      )}
    </div>
  );
}
