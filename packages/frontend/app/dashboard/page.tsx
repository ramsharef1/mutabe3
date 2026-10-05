'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Row {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  category?: { name: string } | null;
  author?: { name: string } | null;
}

const STATUS_AR: Record<string, string> = { DRAFT: 'مسودة', PUBLISHED: 'منشور', SCHEDULED: 'مجدول', ARCHIVED: 'مؤرشف' };

export default function Dashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const token = () => { try { return localStorage.getItem('accessToken'); } catch { return null; } };

  const load = useCallback(async () => {
    const t = token();
    if (!t) { router.replace('/auth/login'); return; }
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } });
      if (!meRes.ok) { router.replace('/auth/login'); return; }
      setMe(await meRes.json());
      const res = await fetch('/api/admin/articles', { headers: { Authorization: `Bearer ${t}` } });
      if (res.status === 401) { router.replace('/auth/login'); return; }
      if (res.status === 403) { setErr('ليس لديك صلاحية الوصول إلى لوحة التحكم.'); setRows([]); return; }
      const j = await res.json();
      setRows(j.data || []);
      setErr('');
    } catch {
      setErr('تعذّر تحميل المقالات. تحقّق من الاتصال.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const logout = () => {
    try { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); } catch {}
    router.replace('/auth/login');
  };

  const del = async (id: string, title: string) => {
    if (!confirm(`حذف المقال «${title}»؟ لا يمكن التراجع.`)) return;
    const t = token();
    const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) setRows((r) => r.filter((x) => x.id !== id));
    else alert('تعذّر الحذف.');
  };

  const fmt = (d: string) => { try { return new Date(d).toLocaleDateString('ar-JO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-brand"><b>المتابع</b><span>لوحة التحكم</span></div>
        <div className="adm-actions">
          <a className="adm-link" href="/" target="_blank" rel="noopener">عرض الموقع ↗</a>
          <a className="adm-link" href="/dashboard/account">كلمة المرور</a>
          {me && <span className="adm-user">{me.name} · {me.role}</span>}
          <button type="button" className="adm-logout" onClick={logout}>خروج</button>
        </div>
      </header>

      <main className="adm-main">
        <div className="adm-head">
          <h1>المقالات {rows.length ? `(${rows.length})` : ''}</h1>
          <a className="adm-new" href="/dashboard/article/new">+ مقال جديد</a>
        </div>

        {err && <div className="adm-err">{err}</div>}
        {loading ? (
          <div className="adm-loading">جاري التحميل…</div>
        ) : !err && rows.length === 0 ? (
          <div className="adm-empty">لا توجد مقالات بعد. ابدأ بإنشاء <a href="/dashboard/article/new">مقال جديد</a>.</div>
        ) : (
          <table className="adm-table">
            <thead><tr><th>العنوان</th><th>القسم</th><th>الحالة</th><th>آخر تحديث</th><th>إجراءات</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="adm-title">{a.title}</td>
                  <td>{a.category?.name || '—'}</td>
                  <td><span className={`adm-badge s-${a.status.toLowerCase()}`}>{STATUS_AR[a.status] || a.status}</span></td>
                  <td className="adm-date">{fmt(a.updatedAt)}</td>
                  <td className="adm-ops">
                    <a href={`/dashboard/article/${a.id}`}>تعديل</a>
                    <a href={`/article/${a.id}`} target="_blank" rel="noopener">معاينة</a>
                    <button type="button" onClick={() => del(a.id, a.title)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
