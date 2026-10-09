'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminNav, { Denied } from '../components/AdminNav';
import { adminFetch, jsonInit, useStaff, ROLE_AR } from '../components/staff';
import { useLoadWhen } from '../../components/hooks';

interface U { id: string; name: string; email: string; role: string; emailVerified: boolean; createdAt: string; _count?: { articles: number } }

const ROLE_HELP: Record<string, string> = {
  ADMIN: 'كل شيء، بما فيه إدارة المستخدمين',
  EDITOR: 'كل المقالات والنشر والجدولة والأقسام والصفحة الرئيسية',
  JOURNALIST: 'يكتب مقالاته ويحفظها مسودات فقط',
  VIEWER: 'لا دخول إلى لوحة التحكم (لإيقاف حساب)',
};

// Admin-only staff management (D-043 Stage 3). No delete: removing a user would
// cascade-delete their articles, so access is revoked by setting the role to VIEWER.
export default function Users() {
  const { me, denied } = useStaff(['ADMIN']);
  const [rows, setRows] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [nw, setNw] = useState({ name: '', email: '', role: 'JOURNALIST', password: '' });

  const flash = (m: string) => { setOk(m); setErr(''); setTimeout(() => setOk(''), 3000); };
  const fail = async (r: Response, fallback: string) => setErr((await r.json().catch(() => ({}))).error || fallback);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await adminFetch('/api/admin/users');
    if (r.ok) setRows((await r.json()).data || []); else await fail(r, 'تعذّر تحميل المستخدمين.');
    setLoading(false);
  }, []);
  useLoadWhen(!!me && !denied, load);

  const update = async (u: U, body: Record<string, string>, msg: string) => {
    setBusy(true);
    const r = await adminFetch(`/api/admin/users/${u.id}`, jsonInit('PUT', body));
    if (r.ok) { const d = (await r.json()).data as U; setRows((x) => x.map((y) => (y.id === u.id ? d : y))); flash(msg); } else { await fail(r, 'تعذّر الحفظ.'); load(); }
    setBusy(false);
  };

  const resetPw = async (u: U) => {
    const pw = prompt(`كلمة مرور جديدة لـ ${u.name} (8 أحرف على الأقل):`, '');
    if (!pw) return;
    await update(u, { password: pw }, `تم تعيين كلمة مرور جديدة لـ ${u.name} — أبلغه بها بطريقة آمنة`);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await adminFetch('/api/admin/users', jsonInit('POST', nw));
    if (r.ok) { const d = (await r.json()).data as U; setRows((x) => [...x, d]); setNw({ name: '', email: '', role: 'JOURNALIST', password: '' }); flash(`أُنشئ حساب ${d.name} ويمكنه الدخول الآن`); } else await fail(r, 'تعذّر الإنشاء.');
    setBusy(false);
  };

  return (
    <div className="adm">
      <AdminNav me={me} />
      {denied ? <Denied /> : (
        <main className="adm-main">
          <div className="adm-head"><h1>المستخدمون {rows.length ? `(${rows.length})` : ''}</h1></div>
          {ok && <div className="adm-ok">{ok}</div>}
          {err && <div className="adm-err">{err}</div>}
          {loading ? <div className="adm-loading">جاري التحميل…</div> : (
            <div className="adm-scroll">
            <table className="adm-table">
              <thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>المقالات</th><th>إجراءات</th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td className="adm-title">{u.name}{u.id === me?.id && <small className="adm-sub">أنت</small>}</td>
                    <td dir="ltr">{u.email}</td>
                    <td>
                      <select value={u.role} disabled={busy} onChange={(e) => update(u, { role: e.target.value }, `أصبح ${u.name} ${ROLE_AR[e.target.value]}`)} aria-label={`دور ${u.name}`}>
                        {Object.keys(ROLE_AR).map((r) => <option key={r} value={r}>{ROLE_AR[r]}</option>)}
                      </select>
                    </td>
                    <td>{u._count?.articles ?? 0}</td>
                    <td className="adm-ops"><button type="button" onClick={() => resetPw(u)} disabled={busy}>كلمة مرور جديدة</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          <dl className="adm-roles">
            {Object.keys(ROLE_HELP).map((r) => <div key={r}><dt>{ROLE_AR[r]}</dt><dd>{ROLE_HELP[r]}</dd></div>)}
          </dl>

          <form className="adm-card" onSubmit={add} autoComplete="off">
            <h2>حساب جديد</h2>
            <div className="adm-row">
              <label>الاسم الظاهر على المقالات<input value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} required /></label>
              <label>البريد الإلكتروني<input type="email" value={nw.email} onChange={(e) => setNw({ ...nw, email: e.target.value })} dir="ltr" required /></label>
            </div>
            <div className="adm-row">
              <label>الدور
                <select value={nw.role} onChange={(e) => setNw({ ...nw, role: e.target.value })}>
                  {['JOURNALIST', 'EDITOR', 'ADMIN'].map((r) => <option key={r} value={r}>{ROLE_AR[r]}</option>)}
                </select>
              </label>
              <label>كلمة مرور أولية (8 أحرف على الأقل)<input type="password" value={nw.password} onChange={(e) => setNw({ ...nw, password: e.target.value })} minLength={8} autoComplete="new-password" required /></label>
            </div>
            <p className="adm-note">يُفعَّل الحساب فوراً. أبلغ صاحبه بكلمة المرور بطريقة آمنة واطلب منه تغييرها من «كلمة المرور».</p>
            <button type="submit" className="adm-new" disabled={busy}>إنشاء الحساب</button>
          </form>
        </main>
      )}
    </div>
  );
}
