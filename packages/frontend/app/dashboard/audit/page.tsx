'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminNav, { Denied } from '../components/AdminNav';
import { adminFetch, useStaff, ROLE_AR } from '../components/staff';

// Audit log (SECURITY S-08/S-16, D-064): admins read who changed content, people, ads and mail, and every
// staff sign-in. Read-only by design — the API has no route that edits or deletes an entry; entries older
// than 24 months are dropped by the server's retention sweep.
interface Entry {
  id: string; at: string; actorId: string | null; actorName: string | null; actorRole: string | null;
  action: string; targetType: string | null; targetId: string | null; summary: string | null; meta: Record<string, unknown> | null; ipHash: string | null;
}
interface Staff { id: string; name: string; role: string }

const ACTION_AR: Record<string, string> = {
  'auth.login': 'تسجيل دخول', 'auth.login.fail': 'دخول فاشل', 'auth.password': 'تغيير كلمة المرور',
  'article.create': 'إنشاء مقال', 'article.edit': 'تعديل مقال', 'article.publish': 'نشر', 'article.unpublish': 'إلغاء نشر',
  'article.schedule': 'جدولة', 'article.unschedule': 'إلغاء جدولة', 'article.archive': 'أرشفة', 'article.delete': 'حذف مقال',
  'media.delete': 'حذف صورة',
  'category.create': 'قسم جديد', 'category.update': 'تعديل قسم', 'category.delete': 'حذف قسم', 'category.reorder': 'ترتيب الأقسام',
  'user.create': 'حساب جديد', 'user.role': 'تغيير دور', 'user.rename': 'تغيير اسم', 'user.password': 'كلمة مرور جديدة',
  'homepage.update': 'الصفحة الرئيسية', 'homepage.breaking': 'خبر عاجل',
  'ads.update': 'الإعلانات',
  'comment.approve': 'قبول تعليق', 'comment.reject': 'رفض تعليق', 'comment.pending': 'تعليق للمراجعة', 'comment.delete': 'حذف تعليق',
  'poll.create': 'استطلاع جديد', 'poll.update': 'تعديل استطلاع', 'poll.activate': 'تفعيل استطلاع', 'poll.deactivate': 'إيقاف استطلاع', 'poll.delete': 'حذف استطلاع',
  'newsletter.create': 'عدد نشرة', 'newsletter.test': 'إرسال تجريبي', 'newsletter.send': 'إرسال النشرة', 'newsletter.delete': 'حذف مسودة نشرة',
  'newsletter.auto': 'النشرة التلقائية', 'newsletter.smtp': 'إعدادات البريد',
};
const AREAS: [string, string][] = [
  ['', 'كل العمليات'], ['article', 'المقالات'], ['comment', 'التعليقات'], ['homepage', 'الصفحة الرئيسية'], ['ads', 'الإعلانات'],
  ['newsletter', 'النشرة'], ['poll', 'الاستطلاعات'], ['category', 'الأقسام'], ['media', 'الصور'], ['user', 'المستخدمون'], ['auth', 'الدخول'],
];
// Actions worth a second look get a coloured badge.
const TONE: Record<string, string> = {
  'auth.login.fail': 's-error', 'article.delete': 's-error', 'media.delete': 's-error', 'comment.delete': 's-error', 'poll.delete': 's-error', 'category.delete': 's-error',
  'user.role': 's-warn', 'user.password': 's-warn', 'ads.update': 's-warn', 'newsletter.send': 's-warn', 'newsletter.smtp': 's-warn', 'homepage.breaking': 's-warn',
  'article.publish': 's-published', 'article.unpublish': 's-archived',
};

const when = (iso: string) =>
  new Intl.DateTimeFormat('ar-JO', { timeZone: 'Asia/Amman', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));

export default function Audit() {
  const { me, denied } = useStaff(['ADMIN']);
  const [rows, setRows] = useState<Entry[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [area, setArea] = useState('');
  const [actor, setActor] = useState('');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string) => {
    setLoading(true); setErr('');
    const p = new URLSearchParams({ take: '50' });
    if (area) p.set('action', area);
    if (actor) p.set('actor', actor);
    if (cursor) p.set('cursor', cursor);
    const r = await adminFetch(`/api/admin/audit?${p}`);
    if (r.ok) {
      const j = await r.json();
      setRows((x) => (cursor ? [...x, ...(j.data || [])] : j.data || []));
      setNext(j.next || null);
    } else setErr((await r.json().catch(() => ({}))).error || 'تعذّر تحميل السجل.');
    setLoading(false);
  }, [area, actor]);

  useEffect(() => { if (me && !denied) load(); }, [me, denied, load]);
  useEffect(() => {
    if (!me || denied) return;
    adminFetch('/api/admin/users').then(async (r) => { if (r.ok) setStaff(((await r.json()).data || []).filter((u: Staff) => u.role !== 'VIEWER')); }).catch(() => {});
  }, [me, denied]);

  const targetLink = (e: Entry) =>
    e.targetType === 'article' && e.targetId && e.action !== 'article.delete' ? <a href={`/dashboard/article/${e.targetId}`}>فتح المقال</a> : null;

  return (
    <div className="adm">
      <AdminNav me={me} />
      {denied ? <Denied /> : (
        <main className="adm-main">
          <div className="adm-head"><h1>سجل التدقيق</h1></div>
          <p className="adm-note">كل نشر وحذف وتعديل على المقالات والتعليقات والإعلانات والنشرة والمستخدمين، وكل دخول للطاقم. السجل للقراءة فقط: لا يمكن تعديل أي إدخال أو حذفه، ويُحذف تلقائياً ما مضى عليه 24 شهراً. العنوان يظهر بصمةً مختصرة لا عنواناً حقيقياً.</p>
          <div className="adm-row adm-filters">
            <label>النوع
              <select value={area} onChange={(e) => setArea(e.target.value)}>{AREAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <label>من قام بها
              <select value={actor} onChange={(e) => setActor(e.target.value)}>
                <option value="">الجميع</option>
                <option value="system">النظام (تلقائي)</option>
                {staff.map((u) => <option key={u.id} value={u.id}>{u.name} · {ROLE_AR[u.role] || u.role}</option>)}
              </select>
            </label>
          </div>
          {err && <div className="adm-err">{err}</div>}
          <div className="adm-scroll">
            <table className="adm-table adm-audit">
              <thead><tr><th>الوقت (عمّان)</th><th>من</th><th>العملية</th><th>التفاصيل</th><th>بصمة العنوان</th></tr></thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td className="adm-at">{when(e.at)}</td>
                    <td>{e.actorName ? <>{e.actorName}<small className="adm-sub">{ROLE_AR[e.actorRole || ''] || e.actorRole}</small></> : <span className="adm-sub">{e.action === 'auth.login.fail' ? 'مجهول' : 'النظام'}</span>}</td>
                    <td><span className={`adm-badge ${TONE[e.action] || 's-draft'}`}>{ACTION_AR[e.action] || e.action}</span></td>
                    <td className="adm-title">
                      {e.summary}
                      <div className="adm-ops">
                        {targetLink(e)}
                        {e.meta && Object.keys(e.meta).length > 0 && (
                          <button type="button" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>{open === e.id ? 'إخفاء' : 'المزيد'}</button>
                        )}
                      </div>
                      {open === e.id && <pre className="adm-meta" dir="ltr">{JSON.stringify(e.meta, null, 2)}</pre>}
                    </td>
                    <td dir="ltr" className="adm-sub">{e.ipHash || '—'}</td>
                  </tr>
                ))}
                {!loading && !rows.length && <tr><td colSpan={5} className="adm-sub">لا توجد عمليات مسجّلة{area || actor ? ' بهذا التصفية' : ' بعد'}.</td></tr>}
              </tbody>
            </table>
          </div>
          {loading ? <div className="adm-loading">جاري التحميل…</div> : next && (
            <button type="button" className="adm-new" onClick={() => load(next)}>تحميل المزيد</button>
          )}
        </main>
      )}
    </div>
  );
}
