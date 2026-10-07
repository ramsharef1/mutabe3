'use client';

// «التحديثات المباشرة» (D-068): updates of a LIVE article, written while the coverage runs. Each update
// saves on its own (no need to save the whole article); readers' pages pick it up within 30 seconds.
// Editors on any LIVE article; a journalist only on their own draft (the API enforces the same rule).
import { useCallback, useEffect, useState } from 'react';
import { adminFetch, jsonInit } from '../../components/staff';

interface Entry { id: string; at: string; title: string | null; text: string; key: boolean }

// Western digits, 24-hour, Amman time — the same reading as the public live blog
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Amman' });

export default function LivePanel({ articleId, published }: { articleId: string; published: boolean }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [key, setKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await adminFetch(`/api/admin/articles/${articleId}/live`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || 'تعذّر تحميل التحديثات.'); return; }
      setEntries(j.data.entries); setOpen(j.data.open); setErr('');
    } catch { setErr('تعذّر الاتصال.'); }
  }, [articleId]);
  useEffect(() => { load(); }, [load]);

  const call = async (method: string, path: string, body?: unknown, ok = '') => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await adminFetch(`/api/admin/articles/${articleId}${path}`, jsonInit(method, body));
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || 'تعذّر الحفظ.'); setBusy(false); return false; }
      if (ok) setMsg(ok);
      await load();
    } catch { setErr('تعذّر الاتصال.'); setBusy(false); return false; }
    setBusy(false);
    return true;
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 2) { setErr('اكتب نص التحديث.'); return; }
    if (await call('POST', '/live', { text, title, key }, published ? 'نُشر التحديث.' : 'حُفظ التحديث — يظهر للقراء عند نشر المادة.')) { setText(''); setTitle(''); setKey(false); }
  };

  return (
    <section className="adm-live">
      <div className="hd">
        <h2>التحديثات المباشرة</h2>
        <span className={`state ${open ? 'on' : ''}`}>{open ? 'التغطية جارية' : 'انتهت التغطية'}</span>
        {open
          ? (confirmEnd
            ? <span className="confirm">إنهاء التغطية؟ <button type="button" onClick={async () => { setConfirmEnd(false); await call('PUT', '/live-state', { open: false }, 'أُنهيت التغطية.'); }} disabled={busy}>نعم، أنهِها</button> <button type="button" onClick={() => setConfirmEnd(false)}>تراجع</button></span>
            : <button type="button" className="end" onClick={() => setConfirmEnd(true)} disabled={busy}>إنهاء التغطية</button>)
          : <button type="button" onClick={() => call('PUT', '/live-state', { open: true }, 'استؤنفت التغطية.')} disabled={busy}>استئناف التغطية</button>}
      </div>
      {!published && <p className="adm-hint">المادة غير منشورة بعد: التحديثات تُحفظ وتظهر للقراء عند النشر.</p>}
      {msg && <div className="adm-ok">{msg}</div>}
      {err && <div className="adm-err">{err}</div>}

      {open && (
        <form onSubmit={add} className="add">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={3000} placeholder="ما الجديد؟ (نص عادي)" aria-label="نص التحديث" />
          <div className="row">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="عنوان قصير (اختياري)" aria-label="عنوان التحديث" />
            <label className="chk"><input type="checkbox" checked={key} onChange={(e) => setKey(e.target.checked)} /> لحظة مهمة</label>
            <button type="submit" className="adm-new" disabled={busy}>{busy ? '…' : published ? 'نشر التحديث' : 'حفظ التحديث'}</button>
          </div>
        </form>
      )}

      {entries.length === 0
        ? <p className="adm-hint">لا توجد تحديثات بعد.</p>
        : (
          <ol className="list">
            {entries.map((e) => (
              <li key={e.id} className={e.key ? 'key' : ''}>
                <time>{time(e.at)}</time>
                <div className="body">
                  {e.title && <b>{e.title}</b>}
                  {editing === e.id
                    ? <textarea value={editText} onChange={(x) => setEditText(x.target.value)} rows={3} maxLength={3000} aria-label="تعديل نص التحديث" />
                    : <p>{e.text}</p>}
                </div>
                <div className="adm-ops">
                  {editing === e.id
                    ? <>
                        <button type="button" onClick={async () => { if (await call('PUT', `/live/${e.id}`, { text: editText }, 'عُدّل التحديث.')) setEditing(null); }} disabled={busy}>حفظ</button>
                        <button type="button" onClick={() => setEditing(null)}>إلغاء</button>
                      </>
                    : <>
                        <button type="button" onClick={() => { setEditing(e.id); setEditText(e.text); }}>تعديل</button>
                        <button type="button" onClick={() => call('PUT', `/live/${e.id}`, { key: !e.key })} disabled={busy}>{e.key ? 'إلغاء «مهمة»' : 'لحظة مهمة'}</button>
                        <button type="button" onClick={() => call('DELETE', `/live/${e.id}`, undefined, 'حُذف التحديث.')} disabled={busy}>حذف</button>
                      </>}
                </div>
              </li>
            ))}
          </ol>
        )}
    </section>
  );
}
