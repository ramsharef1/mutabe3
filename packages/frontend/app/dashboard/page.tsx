'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminNav, { Denied } from './components/AdminNav';
import { adminFetch, jsonInit, useStaff, isEditorRole, logout } from './components/staff';
import { useRouter } from 'next/navigation';
import { useLoadWhen } from '../components/hooks';

interface Row {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  scheduledPublishAt?: string | null;
  authorId?: string;
  category?: { name: string } | null;
  author?: { id: string; name: string } | null;
  isSample?: boolean;
}
interface Meta { page: number; per: number; total: number; pages: number; counts: Record<string, number>; all: number; samples: number; real: number }
const PER = 25;
const ORIGIN_AR: Record<string, string> = { all: 'الكل', real: 'حقيقية', sample: 'تجريبية' };

const STATUS_AR: Record<string, string> = { DRAFT: 'مسودة', PUBLISHED: 'منشور', SCHEDULED: 'مجدول', ARCHIVED: 'مؤرشف' };
const fmt = (d?: string | null) => { if (!d) return ''; try { return new Date(d).toLocaleString('ar-JO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export default function Dashboard() {
  const { me, denied } = useStaff();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<string>('ALL');
  // D-087: the server pages the list (25 a page) and filters by status, origin (real/sample) and title
  const [origin, setOrigin] = useState<'all' | 'real' | 'sample'>('all');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [meta, setMeta] = useState<Meta | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per: String(PER), origin, ...(filter !== 'ALL' ? { status: filter } : {}), ...(query ? { q: query } : {}) });
      const res = await adminFetch(`/api/admin/articles?${params}`);
      if (res.status === 401) { logout(); return; }
      if (res.status === 403) { setErr('ليس لديك صلاحية الوصول إلى لوحة التحكم.'); setRows([]); return; }
      const j = await res.json();
      setRows(j.data || []); setMeta(j.meta || null);
      setErr('');
    } catch {
      setErr('تعذّر تحميل المقالات. تحقّق من الاتصال.');
    } finally {
      setLoading(false);
    }
  }, [page, origin, filter, query]);

  useLoadWhen(!!me && !denied, load);
  const pick = (f: () => void) => { f(); setPage(1); }; // any filter change starts again at page 1

  const editor = isEditorRole(me?.role);
  const canDelete = (a: Row) => editor || (a.author?.id === me?.id && a.status === 'DRAFT');

  const del = async (id: string, title: string) => {
    if (!confirm(`حذف المقال «${title}»؟ لا يمكن التراجع.`)) return;
    const res = await adminFetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
    if (res.ok) load(); // counts and paging come from the server
    else alert((await res.json().catch(() => ({}))).error || 'تعذّر الحذف.');
  };

  // Duplicate (D-056): a new DRAFT with the same body, cover, kind and keywords — for follow-ups and recurring formats.
  const dup = async (id: string) => {
    const r = await adminFetch(`/api/admin/articles/${id}`);
    if (!r.ok) { alert('تعذّر قراءة المقال.'); return; }
    const a = (await r.json()).data;
    const body = {
      title: `نسخة من: ${a.title}`, summary: a.summary || '', content: a.content, categoryId: a.categoryId,
      featuredImageUrl: a.featuredImageUrl || null, coverCredit: a.coverCredit || null, coverCaption: a.coverCaption || null,
      kind: a.kind || 'NEWS', sponsorName: a.sponsorName || null, seoKeywords: a.seoKeywords || [], status: 'DRAFT',
    };
    const c = await adminFetch('/api/admin/articles', jsonInit('POST', body));
    const j = await c.json().catch(() => ({}));
    if (c.ok && j.data?.id) router.push(`/dashboard/article/${j.data.id}`);
    else alert(j.error || 'تعذّر إنشاء النسخة.');
  };

  const counts = meta?.counts || {};
  const inOrigin = Object.values(counts).reduce((t, n) => t + n, 0);
  const shown = rows;

  return (
    <div className="adm">
      <AdminNav me={me} />
      {denied ? <Denied /> : (
        <main className="adm-main">
          <div className="adm-head">
            <h1>{editor ? 'المقالات' : 'مقالاتي'} {meta ? `(${meta.all})` : ''}</h1>
            <a className="adm-new" href="/dashboard/article/new">+ مقال جديد</a>
          </div>

          {meta && meta.all > 0 && (
            <div className="adm-filters">
              {meta.samples > 0 && (
                <div className="adm-tabs" role="tablist" aria-label="المصدر">
                  {(['all', 'real', 'sample'] as const).map((o) => (
                    <button key={o} type="button" role="tab" aria-selected={origin === o} className={`${origin === o ? 'on' : ''}${o === 'sample' ? ' smp' : ''}`} onClick={() => pick(() => setOrigin(o))}>
                      {ORIGIN_AR[o]} <small>{o === 'all' ? meta.all : o === 'real' ? meta.real : meta.samples}</small>
                    </button>
                  ))}
                </div>
              )}
              <div className="adm-tabs" role="tablist" aria-label="الحالة">
                {['ALL', 'PUBLISHED', 'SCHEDULED', 'DRAFT', 'ARCHIVED'].map((s) => (
                  (s === 'ALL' || counts[s]) ? (
                    <button key={s} type="button" role="tab" aria-selected={filter === s} className={filter === s ? 'on' : ''} onClick={() => pick(() => setFilter(s))}>
                      {s === 'ALL' ? 'كل الحالات' : STATUS_AR[s]} <small>{s === 'ALL' ? inOrigin : counts[s]}</small>
                    </button>
                  ) : null
                ))}
              </div>
              <form className="adm-search" role="search" onSubmit={(e) => { e.preventDefault(); pick(() => setQuery(q.trim())); }}>
                <input type="search" value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value) pick(() => setQuery('')); }} placeholder="ابحث في العناوين" aria-label="ابحث في عناوين المقالات" />
                <button type="submit">بحث</button>
              </form>
            </div>
          )}

          {err && <div className="adm-err">{err}</div>}
          {loading ? (
            <div className="adm-loading">جاري التحميل…</div>
          ) : !err && rows.length === 0 ? (
            meta && meta.all > 0
              ? <div className="adm-empty">لا مقالات تطابق هذا الاختيار.</div>
              : <div className="adm-empty">لا توجد مقالات بعد. ابدأ بإنشاء <a href="/dashboard/article/new">مقال جديد</a>.</div>
          ) : (
            <div className="adm-scroll">
            <table className="adm-table">
              <thead><tr><th>العنوان</th><th>القسم</th><th className="adm-hide-sm">الكاتب</th><th>الحالة</th><th className="adm-hide-sm">آخر تحديث</th><th>إجراءات</th></tr></thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.id}>
                    <td className="adm-title">{a.isSample && <span className="adm-smp" title="مادة تجريبية — تُخفى بنقرة من «الصفحة الرئيسية»">تجريبي</span>}{a.title}</td>
                    <td>{a.category?.name || '—'}</td>
                    <td className="adm-hide-sm">{a.author?.name || '—'}</td>
                    <td>
                      <span className={`adm-badge s-${a.status.toLowerCase()}`}>{STATUS_AR[a.status] || a.status}</span>
                      {a.status === 'SCHEDULED' && a.scheduledPublishAt && <small className="adm-when">⏰ {fmt(a.scheduledPublishAt)}</small>}
                    </td>
                    <td className="adm-date adm-hide-sm">{fmt(a.updatedAt)}</td>
                    <td className="adm-ops">
                      {(editor || a.status === 'DRAFT') && <a href={`/dashboard/article/${a.id}`}>تعديل</a>}
                      {(editor || a.author?.id === me?.id) && <button type="button" onClick={() => dup(a.id)} title="إنشاء مسودة جديدة بنفس المحتوى">نسخ</button>}
                      {/* published → the live page; anything else → the admin-only preview (the public route 404s for drafts) */}
                      <a href={a.status === 'PUBLISHED' ? `/article/${a.id}` : `/dashboard/preview/${a.id}`} target="_blank" rel="noopener">معاينة</a>
                      {canDelete(a) && <button type="button" onClick={() => del(a.id, a.title)}>حذف</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          {meta && meta.pages > 1 && (
            <nav className="adm-pager" aria-label="صفحات المقالات">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</button>
              <span>صفحة {page} من {meta.pages} · {meta.total} مقالاً</span>
              <button type="button" disabled={page >= meta.pages} onClick={() => setPage(page + 1)}>التالي</button>
            </nav>
          )}
        </main>
      )}
    </div>
  );
}
