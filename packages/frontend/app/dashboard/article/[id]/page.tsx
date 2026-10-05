'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RichEditor, { textToHtml } from '../../components/RichEditor';
import { uploadImage, listMedia } from '../../components/upload';
import { adminFetch, jsonInit, useStaff, isEditorRole, ROLE_AR, refreshHomepage } from '../../components/staff';
import { isHtml, plain } from '../../../components/util';

interface Cat { id: string; name: string }

// <input type="datetime-local"> works in the browser's local time (Amman for the
// newsroom); the API stores UTC. These two helpers convert both ways.
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString(); };

export default function Editor() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const { me, denied } = useStaff();
  const editor = isEditorRole(me?.role);

  const [cats, setCats] = useState<Cat[]>([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [featuredImageUrl, setImage] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [loadedStatus, setLoadedStatus] = useState('DRAFT');
  const [when, setWhen] = useState(''); // datetime-local value for SCHEDULED
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [err, setErr] = useState('');
  const coverRef = useRef<HTMLInputElement>(null);

  const init = useCallback(async () => {
    try {
      const catRes = await fetch('/api/categories');
      const catJson = await catRes.json();
      const cl: Cat[] = catJson.data || [];
      setCats(cl);
      if (!isNew) {
        const res = await adminFetch(`/api/admin/articles/${id}`);
        if (res.status === 401) { router.replace('/auth/login'); return; }
        if (!res.ok) { setErr((await res.json().catch(() => ({}))).error || 'المقال غير موجود.'); setLoading(false); return; }
        const a = (await res.json()).data;
        const c: string = a.content || '';
        setTitle(a.title || ''); setSummary(a.summary || '');
        setContent(isHtml(c) ? c : textToHtml(c)); // seeded articles are plain text
        setCategoryId(a.categoryId || cl[0]?.id || ''); setImage(a.featuredImageUrl || '');
        setStatus(a.status || 'DRAFT'); setLoadedStatus(a.status || 'DRAFT');
        setWhen(toLocalInput(a.scheduledPublishAt));
        setKeywords((a.seoKeywords || []).join('، '));
      } else {
        setCategoryId(cl[0]?.id || '');
      }
    } catch { setErr('تعذّر التحميل.'); }
    finally { setLoading(false); }
  }, [id, isNew, router]);

  useEffect(() => { if (me && !denied) init(); }, [me, denied, init]);

  const save = async (publish?: boolean) => {
    setErr('');
    const hasBody = plain(content).trim() || /<(img|iframe)/i.test(content);
    if (!title.trim() || !hasBody || !categoryId) { setErr('العنوان والمحتوى والقسم مطلوبة.'); return; }
    const st = publish === true ? 'PUBLISHED' : publish === false ? 'DRAFT' : status;
    const scheduledPublishAt = st === 'SCHEDULED' ? fromLocalInput(when) : null;
    if (st === 'SCHEDULED') {
      if (!scheduledPublishAt) { setErr('حدّد موعد النشر للمقال المجدول.'); return; }
      if (new Date(scheduledPublishAt).getTime() < Date.now() - 60_000) { setErr('موعد النشر في الماضي — اختر وقتاً قادماً أو انشر الآن.'); return; }
    }
    setSaving(true);
    const body = {
      title: title.trim(), summary: summary.trim(), content, categoryId,
      featuredImageUrl: featuredImageUrl.trim() || null,
      status: st,
      scheduledPublishAt,
      seoKeywords: keywords.split(/[,،]/).map((s) => s.trim()).filter(Boolean),
    };
    try {
      const res = await adminFetch(isNew ? '/api/admin/articles' : `/api/admin/articles/${id}`, jsonInit(isNew ? 'POST' : 'PUT', body));
      // Never navigate away on an auth failure: the article would be lost.
      if (res.status === 401) { setErr('انتهت الجلسة. افتح صفحة الدخول في نافذة أخرى، سجّل الدخول، ثم اضغط حفظ مجدداً — لن يضيع ما كتبته.'); setSaving(false); return; }
      if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error || 'تعذّر الحفظ.'); setSaving(false); return; }
      // Anything that is or was live changes the homepage; refresh it before leaving.
      if (editor && (st === 'PUBLISHED' || loadedStatus === 'PUBLISHED')) await refreshHomepage();
      router.replace('/dashboard');
    } catch { setErr('تعذّر الحفظ. تحقّق من الاتصال.'); setSaving(false); }
  };

  const pickCover = async (f?: File) => {
    if (!f) return;
    setImgBusy(true); setErr('');
    try { setImage(await uploadImage(f)); }
    catch (e: any) { setErr(e?.message || 'فشل رفع الصورة'); }
    finally { setImgBusy(false); }
  };

  if (denied) return <div className="adm"><main className="adm-main"><div className="adm-err">ليس لديك صلاحية الوصول إلى لوحة التحكم.</div></main></div>;
  if (loading) return <div className="adm"><div className="adm-loading">جاري التحميل…</div></div>;

  // Journalists write and save drafts; publishing, scheduling and archiving are editors' calls.
  const lockedForJournalist = !editor && !isNew && loadedStatus !== 'DRAFT';

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-brand"><a href="/dashboard" className="adm-back">‹ لوحة التحكم</a></div>
        <div className="adm-actions">
          {me && <span className="adm-user">{me.name} · {ROLE_AR[me.role]}</span>}
          {!isNew && <a className="adm-link" href={loadedStatus === 'PUBLISHED' ? `/article/${id}` : `/dashboard/preview/${id}`} target="_blank" rel="noopener">معاينة ↗</a>}
          <button type="button" className="adm-logout" onClick={() => save(false)} disabled={saving || lockedForJournalist}>حفظ كمسودة</button>
          {editor && status === 'SCHEDULED' && <button type="button" className="adm-logout" onClick={() => save()} disabled={saving}>{saving ? '…' : 'حفظ الجدولة'}</button>}
          {editor && <button type="button" className="adm-new" onClick={() => save(true)} disabled={saving}>{saving ? '…' : 'نشر الآن'}</button>}
        </div>
      </header>

      <main className="adm-main adm-editor">
        <h1>{isNew ? 'مقال جديد' : 'تعديل المقال'}</h1>
        {!editor && <div className="adm-note">بصفتك صحفياً تُحفظ مقالاتك كمسودات، ويتولّى المحرر نشرها أو جدولتها.</div>}
        {lockedForJournalist && <div className="adm-err">هذا المقال لم يعد مسودة؛ التعديل عليه للمحررين فقط.</div>}
        {err && <div className="adm-err">{err}</div>}

        <label>العنوان<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان المقال" /></label>
        <label>الملخّص<textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="ملخّص قصير يظهر في القوائم ومعاينات المشاركة" /></label>

        <div className="adm-field">
          <span className="adm-lbl">المحتوى</span>
          <RichEditor value={content} onChange={setContent} upload={uploadImage} listMedia={listMedia} />
        </div>

        <div className="adm-row">
          <label>القسم
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {editor && (
            <label>الحالة
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="DRAFT">مسودة</option>
                <option value="PUBLISHED">منشور</option>
                <option value="SCHEDULED">مجدول</option>
                <option value="ARCHIVED">مؤرشف</option>
              </select>
            </label>
          )}
          {editor && status === 'SCHEDULED' && (
            <label>موعد النشر (بتوقيت عمّان)
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </label>
          )}
        </div>

        <div className="adm-field">
          <span className="adm-lbl">صورة الغلاف</span>
          <div className="adm-cover">
            {featuredImageUrl ? <img src={featuredImageUrl} alt="" /> : <div className="ph">لا توجد صورة</div>}
            <div className="ops">
              <button type="button" className="adm-logout" onClick={() => coverRef.current?.click()} disabled={imgBusy}>{imgBusy ? 'جاري الرفع…' : 'رفع صورة'}</button>
              {featuredImageUrl && <button type="button" className="adm-logout" onClick={() => setImage('')}>إزالة</button>}
              <input value={featuredImageUrl} onChange={(e) => setImage(e.target.value)} placeholder="أو الصق رابط صورة https://…" dir="ltr" />
            </div>
          </div>
          <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => { pickCover(e.target.files?.[0]); e.target.value = ''; }} />
        </div>

        <label>كلمات مفتاحية (SEO)<input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="الأردن، اقتصاد، عمّان" /></label>
      </main>
    </div>
  );
}
