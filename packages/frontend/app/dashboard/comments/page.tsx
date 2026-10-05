'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminNav, { Denied } from '../components/AdminNav';
import { adminFetch, jsonInit, useStaff, EDITORS } from '../components/staff';

interface C { id: string; content: string; status: string; authorName: string | null; authorEmail: string | null; ipHash: string | null; createdAt: string; article: { id: string; title: string } }

const TABS: [string, string][] = [['PENDING', 'بانتظار المراجعة'], ['APPROVED', 'منشورة'], ['REJECTED', 'مرفوضة']];
const fmt = (d: string) => { try { return new Date(d).toLocaleString('ar-JO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

// Comment moderation (D-043 Stage 4): readers' comments wait here until an editor approves them.
export default function Comments() {
  const { me, denied } = useStaff(EDITORS);
  const [tab, setTab] = useState('PENDING');
  const [rows, setRows] = useState<C[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [r, c] = await Promise.all([adminFetch(`/api/admin/comments?status=${tab}`), adminFetch('/api/admin/comments/counts')]);
    if (r.ok) setRows((await r.json()).data || []); else setErr('تعذّر تحميل التعليقات.');
    if (c.ok) setCounts((await c.json()).data || {});
    setLoading(false);
  }, [tab]);
  useEffect(() => { if (me && !denied) load(); }, [me, denied, load]);

  const act = async (c: C, status: string) => {
    setBusy(c.id); setErr('');
    const r = await adminFetch(`/api/admin/comments/${c.id}`, jsonInit('PUT', { status }));
    if (r.ok) {
      setRows((x) => x.filter((y) => y.id !== c.id));
      setCounts((x) => ({ ...x, [c.status]: Math.max(0, (x[c.status] || 1) - 1), [status]: (x[status] || 0) + 1 }));
    } else setErr((await r.json().catch(() => ({}))).error || 'تعذّر الحفظ.');
    setBusy(null);
  };

  const del = async (c: C) => {
    if (!confirm('حذف التعليق نهائياً؟')) return;
    setBusy(c.id);
    const r = await adminFetch(`/api/admin/comments/${c.id}`, { method: 'DELETE' });
    if (r.ok) { setRows((x) => x.filter((y) => y.id !== c.id)); setCounts((x) => ({ ...x, [c.status]: Math.max(0, (x[c.status] || 1) - 1) })); }
    else setErr('تعذّر الحذف.');
    setBusy(null);
  };

  return (
    <div className="adm">
      <AdminNav me={me} />
      {denied ? <Denied /> : (
        <main className="adm-main">
          <div className="adm-head"><h1>التعليقات</h1></div>
          <div className="adm-tabs" role="tablist">
            {TABS.map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label} <small>{counts[k] ?? 0}</small></button>
            ))}
          </div>
          {err && <div className="adm-err">{err}</div>}
          {loading ? <div className="adm-loading">جاري التحميل…</div> : rows.length === 0 ? (
            <div className="adm-empty">{tab === 'PENDING' ? 'لا تعليقات بانتظار المراجعة.' : 'لا شيء هنا.'}</div>
          ) : (
            <ul className="adm-comments">
              {rows.map((c) => (
                <li key={c.id}>
                  <div className="meta">
                    <b>{c.authorName || 'قارئ'}</b>
                    {c.authorEmail && <span dir="ltr">{c.authorEmail}</span>}
                    <span>{fmt(c.createdAt)}</span>
                    {c.ipHash && <span title="بصمة مجهّلة لعنوان المرسل — تساعد على كشف التعليقات المكررة">#{c.ipHash}</span>}
                  </div>
                  <p>{c.content}</p>
                  <div className="on-article">على: <a href={`/article/${c.article.id}#comments`} target="_blank" rel="noopener">{c.article.title}</a></div>
                  <div className="adm-ops">
                    {c.status !== 'APPROVED' && <button type="button" className="ok" disabled={busy === c.id} onClick={() => act(c, 'APPROVED')}>نشر</button>}
                    {c.status !== 'REJECTED' && <button type="button" disabled={busy === c.id} onClick={() => act(c, 'REJECTED')}>رفض</button>}
                    {c.status !== 'PENDING' && <button type="button" disabled={busy === c.id} onClick={() => act(c, 'PENDING')}>إعادة للمراجعة</button>}
                    <button type="button" disabled={busy === c.id} onClick={() => del(c)}>حذف</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </main>
      )}
    </div>
  );
}
