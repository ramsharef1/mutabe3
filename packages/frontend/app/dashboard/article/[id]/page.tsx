'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RichEditor, { textToHtml } from '../../components/RichEditor';
import { token, uploadImage, listMedia } from '../../components/upload';
import { isHtml, plain } from '../../../components/util';

interface Cat { id: string; name: string }

export default function Editor() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';

  const [cats, setCats] = useState<Cat[]>([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [featuredImageUrl, setImage] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [err, setErr] = useState('');
  const coverRef = useRef<HTMLInputElement>(null);

  const init = useCallback(async () => {
    const t = token();
    if (!t) { router.replace('/auth/login'); return; }
    try {
      const catRes = await fetch('/api/categories');
      const catJson = await catRes.json();
      const cl: Cat[] = catJson.data || [];
      setCats(cl);
      if (!isNew) {
        const res = await fetch(`/api/admin/articles/${id}`, { headers: { Authorization: `Bearer ${t}` } });
        if (res.status === 401 || res.status === 403) { router.replace('/auth/login'); return; }
        if (!res.ok) { setErr('المقال غير موجود.'); setLoading(false); return; }
        const a = (await res.json()).data;
        const c: string = a.content || '';
        setTitle(a.title || ''); setSummary(a.summary || '');
        setContent(isHtml(c) ? c : textToHtml(c)); // seeded articles are plain text
        setCategoryId(a.categoryId || cl[0]?.id || ''); setImage(a.featuredImageUrl || '');
        setStatus(a.status || 'DRAFT'); setKeywords((a.seoKeywords || []).join('، '));
      } else {
        setCategoryId(cl[0]?.id || '');
      }
    } catch { setErr('تعذّر التحميل.'); }
    finally { setLoading(false); }
  }, [id, isNew, router]);

  useEffect(() => { init(); }, [init]);

  const save = async (publish?: boolean) => {
    setErr('');
    const hasBody = plain(content).trim() || /<(img|iframe)/i.test(content);
    if (!title.trim() || !hasBody || !categoryId) { setErr('العنوان والمحتوى والقسم مطلوبة.'); return; }
    setSaving(true);
    const t = token();
    const body = {
      title: title.trim(), summary: summary.trim(), content, categoryId,
      featuredImageUrl: featuredImageUrl.trim() || null,
      status: publish === true ? 'PUBLISHED' : publish === false ? 'DRAFT' : status,
      seoKeywords: keywords.split(/[,،]/).map((s) => s.trim()).filter(Boolean),
    };
    try {
      const res = await fetch(isNew ? '/api/admin/articles' : `/api/admin/articles/${id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(body),
      });
      if (res.status === 401 || res.status === 403) { router.replace('/auth/login'); return; }
      if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error || 'تعذّر الحفظ.'); setSaving(false); return; }
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

  if (loading) return <div className="adm"><div className="adm-loading">جاري التحميل…</div></div>;

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-brand"><a href="/dashboard" className="adm-back">‹ لوحة التحكم</a></div>
        <div className="adm-actions">
          <button type="button" className="adm-logout" onClick={() => save(false)} disabled={saving}>حفظ كمسودة</button>
          <button type="button" className="adm-new" onClick={() => save(true)} disabled={saving}>{saving ? '…' : 'نشر'}</button>
        </div>
      </header>

      <main className="adm-main adm-editor">
        <h1>{isNew ? 'مقال جديد' : 'تعديل المقال'}</h1>
        {err && <div className="adm-err">{err}</div>}

        <label>العنوان<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان المقال" /></label>
        <label>الملخّص<textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="ملخّص قصير يظهر في القوائم" /></label>

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
          <label>الحالة
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="DRAFT">مسودة</option>
              <option value="PUBLISHED">منشور</option>
              <option value="SCHEDULED">مجدول</option>
              <option value="ARCHIVED">مؤرشف</option>
            </select>
          </label>
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
