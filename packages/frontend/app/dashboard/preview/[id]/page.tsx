'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Article } from '../../../components/util';
import ArticleView from '../../../article/[id]/ArticleView';
import { adminFetch } from '../../components/staff';

// Editor-only preview: renders an article of ANY status exactly as the public
// page would, using the admin API (the public route 404s for drafts). Views are
// not counted. Linked from the dashboard's "معاينة" for non-published rows.
export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [a, setA] = useState<Article | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let t: string | null = null;
    try { t = localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'); } catch {}
    if (!t) { router.replace('/auth/login'); return; }
    adminFetch(`/api/admin/articles/${id}`)
      .then(async (r) => {
        if (r.status === 401) { router.replace('/auth/login'); return; }
        if (r.status === 403) { setErr((await r.json().catch(() => ({}))).error || 'ليس لديك صلاحية على هذا المقال.'); return; }
        if (!r.ok) { setErr('المقال غير موجود.'); return; }
        setA((await r.json()).data as Article);
      })
      .catch(() => setErr('تعذّر تحميل المقال. تحقّق من الاتصال.'));
  }, [id, router]);

  if (err) return <div className="adm"><div className="adm-main"><div className="adm-err">{err}</div><a className="adm-link" href="/dashboard">‹ لوحة التحكم</a></div></div>;
  if (!a) return <div className="adm"><div className="adm-loading">جاري تحميل المعاينة…</div></div>;

  const status = a.status === 'PUBLISHED' ? 'منشور' : a.status === 'SCHEDULED' ? 'مجدول' : a.status === 'ARCHIVED' ? 'مؤرشف' : 'مسودة';
  return (
    <>
      <div className="preview-bar" role="status">
        <span>معاينة · {status} — هذه الصفحة ليست علنية ولا تُحتسب مشاهداتها</span>
        <a href={`/dashboard/article/${a.id}`}>العودة للتحرير</a>
        <a href="/dashboard">لوحة التحكم</a>
      </div>
      <ArticleView article={a} preview />
    </>
  );
}
