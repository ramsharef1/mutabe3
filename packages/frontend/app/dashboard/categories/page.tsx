'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminNav, { Denied } from '../components/AdminNav';
import { adminFetch, jsonInit, useStaff, EDITORS } from '../components/staff';

interface Cat { id: string; name: string; slug: string; description: string | null; displayOrder: number; showInNav: boolean; _count?: { articles: number } }

// Categories: rename, reorder, show/hide in the header nav, add, delete empty ones (D-043 Stage 3).
export default function Categories() {
  const { me, denied } = useStaff(EDITORS);
  const [rows, setRows] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<Record<string, { name: string; description: string }>>({});
  const [nw, setNw] = useState({ name: '', slug: '', description: '', showInNav: true });

  const flash = (m: string) => { setOk(m); setErr(''); setTimeout(() => setOk(''), 2500); };
  const fail = async (r: Response, fallback: string) => setErr((await r.json().catch(() => ({}))).error || fallback);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await adminFetch('/api/admin/categories');
    if (r.ok) setRows((await r.json()).data || []); else await fail(r, 'تعذّر تحميل الأقسام.');
    setLoading(false);
  }, []);
  useEffect(() => { if (me && !denied) load(); }, [me, denied, load]);

  const patch = async (c: Cat, body: Partial<Cat>, msg: string) => {
    setBusy(true);
    const r = await adminFetch(`/api/admin/categories/${c.id}`, jsonInit('PUT', body));
    if (r.ok) { const d = (await r.json()).data as Cat; setRows((x) => x.map((y) => (y.id === c.id ? d : y))); flash(msg); } else await fail(r, 'تعذّر الحفظ.');
    setBusy(false);
  };

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
    setBusy(true);
    const r = await adminFetch('/api/admin/categories/order', jsonInit('PUT', { ids: next.map((c) => c.id) }));
    if (r.ok) { setRows((await r.json()).data || next); flash('تم حفظ الترتيب'); } else { await fail(r, 'تعذّر حفظ الترتيب.'); load(); }
    setBusy(false);
  };

  const saveEdit = async (c: Cat) => {
    const e = edit[c.id];
    if (!e) return;
    await patch(c, { name: e.name, description: e.description }, 'تم الحفظ');
    setEdit((x) => { const y = { ...x }; delete y[c.id]; return y; });
  };

  const remove = async (c: Cat) => {
    if (!confirm(`حذف قسم «${c.name}»؟`)) return;
    setBusy(true);
    const r = await adminFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
    if (r.ok) { setRows((x) => x.filter((y) => y.id !== c.id)); flash('تم الحذف'); } else await fail(r, 'تعذّر الحذف.');
    setBusy(false);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await adminFetch('/api/admin/categories', jsonInit('POST', nw));
    if (r.ok) { const d = (await r.json()).data as Cat; setRows((x) => [...x, d]); setNw({ name: '', slug: '', description: '', showInNav: true }); flash('أُضيف القسم'); } else await fail(r, 'تعذّر الإضافة.');
    setBusy(false);
  };

  return (
    <div className="adm">
      <AdminNav me={me} />
      {denied ? <Denied /> : (
        <main className="adm-main">
          <div className="adm-head"><h1>الأقسام {rows.length ? `(${rows.length})` : ''}</h1></div>
          <p className="adm-note">الترتيب هنا هو ترتيب القائمة في رأس الموقع وتذييله. الأقسام غير الظاهرة في القائمة تبقى صفحاتها متاحة على روابطها.</p>
          {ok && <div className="adm-ok">{ok}</div>}
          {err && <div className="adm-err">{err}</div>}
          {loading ? <div className="adm-loading">جاري التحميل…</div> : (
            <div className="adm-scroll">
            <table className="adm-table">
              <thead><tr><th>الترتيب</th><th>الاسم</th><th>المعرّف</th><th>المقالات</th><th>في القائمة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {rows.map((c, i) => {
                  const e = edit[c.id];
                  const n = c._count?.articles ?? 0;
                  return (
                    <tr key={c.id}>
                      <td className="adm-order">
                        <button type="button" onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label="نقل لأعلى">▲</button>
                        <button type="button" onClick={() => move(i, 1)} disabled={busy || i === rows.length - 1} aria-label="نقل لأسفل">▼</button>
                      </td>
                      <td className="adm-title">
                        {e ? (
                          <div className="adm-inline">
                            <input value={e.name} onChange={(ev) => setEdit((x) => ({ ...x, [c.id]: { ...e, name: ev.target.value } }))} aria-label="اسم القسم" />
                            <input value={e.description} onChange={(ev) => setEdit((x) => ({ ...x, [c.id]: { ...e, description: ev.target.value } }))} placeholder="وصف يظهر أعلى صفحة القسم" aria-label="وصف القسم" />
                          </div>
                        ) : (<>{c.name}{c.description && <small className="adm-sub">{c.description}</small>}</>)}
                      </td>
                      <td dir="ltr"><a href={`/category/${c.slug}`} target="_blank" rel="noopener">{c.slug}</a></td>
                      <td>{n}</td>
                      <td><input type="checkbox" checked={c.showInNav} disabled={busy} onChange={(ev) => patch(c, { showInNav: ev.target.checked }, ev.target.checked ? 'سيظهر في القائمة' : 'أُخفي من القائمة')} aria-label="إظهار في القائمة" /></td>
                      <td className="adm-ops">
                        {e ? (<><button type="button" onClick={() => saveEdit(c)} disabled={busy}>حفظ</button><button type="button" onClick={() => setEdit((x) => { const y = { ...x }; delete y[c.id]; return y; })}>إلغاء</button></>)
                          : <button type="button" onClick={() => setEdit((x) => ({ ...x, [c.id]: { name: c.name, description: c.description || '' } }))}>تعديل</button>}
                        <button type="button" onClick={() => remove(c)} disabled={busy || n > 0} title={n > 0 ? 'انقل مقالات القسم أولاً' : ''}>حذف</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}

          <form className="adm-card" onSubmit={add}>
            <h2>قسم جديد</h2>
            <div className="adm-row">
              <label>الاسم<input value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} placeholder="مثال: رياضة" required /></label>
              <label>المعرّف في الرابط<input value={nw.slug} onChange={(e) => setNw({ ...nw, slug: e.target.value.toLowerCase() })} placeholder="sports" dir="ltr" pattern="[a-z0-9]+(-[a-z0-9]+)*" title="حروف لاتينية صغيرة وأرقام وشرطات" required /></label>
            </div>
            <label>الوصف<input value={nw.description} onChange={(e) => setNw({ ...nw, description: e.target.value })} placeholder="اختياري" /></label>
            <label className="adm-check"><input type="checkbox" checked={nw.showInNav} onChange={(e) => setNw({ ...nw, showInNav: e.target.checked })} /> يظهر في قائمة الموقع</label>
            <button type="submit" className="adm-new" disabled={busy}>إضافة القسم</button>
          </form>
        </main>
      )}
    </div>
  );
}
