'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RichEditor, { textToHtml } from '../../components/RichEditor';
import { uploadImage, listMedia, deleteMedia } from '../../components/upload';
import { adminFetch, jsonInit, useStaff, isEditorRole, ROLE_AR, refreshHomepage } from '../../components/staff';
import { isHtml, plain } from '../../../components/util';
import { imgAt } from '../../../components/img';
import LivePanel from './LivePanel';
import { useLoadWhen } from '../../../components/hooks';

// Article kinds (ArticleKind, D-056) and the editor's templates per kind.
type Kind = 'NEWS' | 'OPINION' | 'EXPLAINER' | 'SPONSORED' | 'LIVE' | 'VIDEO' | 'GALLERY' | 'CARICATURE' | 'NOTICE';
const KIND_AR: Record<Kind, string> = {
  NEWS: 'خبر', OPINION: 'رأي', EXPLAINER: 'شرح وتحليل', SPONSORED: 'محتوى مدفوع (إعلان)', LIVE: 'تغطية مباشرة',
  VIDEO: 'فيديو', GALLERY: 'ألبوم صور', CARICATURE: 'كاريكاتير', NOTICE: 'إعلان مبوّب (وفيات/تهاني/عطاءات)',
};
interface Template { label: string; hint: string; kind: Kind; html: string }
const TEMPLATES: Template[] = [
  { label: 'عاجل', hint: 'جملة واحدة ثم ما ثبت حتى الآن', kind: 'NEWS',
    html: '<p><strong>عاجل —</strong> [الخبر في جملة واحدة].</p><p>[التفاصيل المتوفرة حتى الآن، مع المصدر].</p><p><em>يُحدَّث الخبر تباعاً.</em></p>' },
  { label: 'تقرير', hint: 'مقدمة، خلفية، تفاصيل، ردود فعل، ماذا بعد', kind: 'NEWS',
    html: '<p>[المقدمة: من، ماذا، متى، أين، لماذا].</p><h2>الخلفية</h2><p>[…]</p><h2>التفاصيل</h2><p>[…]</p><h2>ردود الفعل</h2><p>[…]</p><h2>ماذا بعد؟</h2><p>[…]</p>' },
  { label: 'تصريح', hint: 'من قال ماذا، الاقتباس، السياق', kind: 'NEWS',
    html: '<p>قال [الاسم والصفة] إن [ملخّص التصريح]، وذلك في [المناسبة أو المكان] يوم [اليوم].</p><blockquote>[الاقتباس الحرفي]</blockquote><p>[السياق وما سبق التصريح].</p>' },
  { label: 'شرح', hint: 'ما القصة، لماذا الآن، الأرقام، ماذا يعني لك', kind: 'EXPLAINER',
    html: '<p>[لماذا يهم هذا الموضوع الآن].</p><h2>ما القصة؟</h2><p>[…]</p><h2>لماذا الآن؟</h2><p>[…]</p><h2>الأرقام الأساسية</h2><ul><li>[…]</li><li>[…]</li></ul><h2>ماذا يعني لك؟</h2><p>[…]</p>' },
  { label: 'عمود رأي', hint: 'فكرة واحدة، حجج، خاتمة، توقيع الكاتب', kind: 'OPINION',
    html: '<p>[الفكرة الرئيسية في فقرة].</p><p>[الحجة الأولى].</p><p>[الحجة الثانية].</p><p>[الخاتمة].</p><p><em>[اسم الكاتب] — كاتب في المتابع</em></p>' },
  // D-068: the homepage video section uses the first YouTube video in the body; the caricature block uses the cover image.
  { label: 'فيديو', hint: 'أضف الفيديو بزر «▶ فيديو» في شريط الأدوات، ثم وصفاً قصيراً', kind: 'VIDEO',
    html: '<p>[وصف الفيديو في جملتين: ماذا يعرض، أين ومتى صُوّر].</p><p>[أضف الفيديو هنا بزر «▶ فيديو»].</p><p><em>تصوير: [الاسم]</em></p>' },
  { label: 'كاريكاتير', hint: 'ارفع الرسم كصورة الغلاف — يظهر كاملاً دون قص', kind: 'CARICATURE',
    html: '<p>[تعليق الرسام أو عنوان الرسم إن وُجد].</p><p><em>بريشة: [اسم الرسام]</em></p>' },
  { label: 'تغطية مباشرة', hint: 'مقدمة ثابتة؛ التحديثات تُضاف من لوحة «التحديثات المباشرة» بعد الحفظ', kind: 'LIVE',
    html: '<p>[ما الحدث، أين ومتى، ولماذا نتابعه مباشرة].</p><p>[ما نعرفه حتى الآن في سطرين].</p>' },
];

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
  const [coverCredit, setCoverCredit] = useState('');
  const [coverCaption, setCoverCaption] = useState('');
  const [kind, setKind] = useState<Kind>('NEWS');
  const [sponsorName, setSponsorName] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [loadedStatus, setLoadedStatus] = useState('DRAFT');
  const [savedKind, setSavedKind] = useState<Kind | null>(null); // the live panel needs the article stored as LIVE (D-068)
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
        setCoverCredit(a.coverCredit || ''); setCoverCaption(a.coverCaption || '');
        setKind((KIND_AR[a.kind as Kind] ? a.kind : 'NEWS') as Kind); setSavedKind(a.kind); setSponsorName(a.sponsorName || '');
        setStatus(a.status || 'DRAFT'); setLoadedStatus(a.status || 'DRAFT');
        setWhen(toLocalInput(a.scheduledPublishAt));
        setKeywords((a.seoKeywords || []).join('، '));
      } else {
        // Remembered category (D-056): a desk mostly files to the same section run after run.
        let remembered = '';
        try { remembered = localStorage.getItem('lastCategoryId') || ''; } catch {}
        setCategoryId(cl.some((c) => c.id === remembered) ? remembered : cl[0]?.id || '');
      }
    } catch { setErr('تعذّر التحميل.'); }
    finally { setLoading(false); }
  }, [id, isNew, router]);

  useLoadWhen(!!me && !denied, init);

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
      coverCredit: coverCredit.trim() || null,
      coverCaption: coverCaption.trim() || null,
      kind,
      sponsorName: kind === 'SPONSORED' ? sponsorName.trim() || null : null,
      status: st,
      scheduledPublishAt,
      seoKeywords: keywords.split(/[,،]/).map((s) => s.trim()).filter(Boolean),
    };
    try {
      const res = await adminFetch(isNew ? '/api/admin/articles' : `/api/admin/articles/${id}`, jsonInit(isNew ? 'POST' : 'PUT', body));
      // Never navigate away on an auth failure: the article would be lost.
      if (res.status === 401) { setErr('انتهت الجلسة. افتح صفحة الدخول في نافذة أخرى، سجّل الدخول، ثم اضغط حفظ مجدداً — لن يضيع ما كتبته.'); setSaving(false); return; }
      if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error || 'تعذّر الحفظ.'); setSaving(false); return; }
      try { localStorage.setItem('lastCategoryId', categoryId); } catch {}
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

  // Keyboard (D-056): Ctrl/Cmd+S saves a draft, Ctrl/Cmd+Enter publishes (editors). Hooks stay above the early
  // returns below (hooks order); the latest handlers are reached through refs.
  const saveRef = useRef(save);
  const lockRef = useRef(!editor && !isNew && loadedStatus !== 'DRAFT');
  const editorRef = useRef(editor);
  // refs are updated after each render, not during it (D-085, React Compiler rule)
  useEffect(() => { saveRef.current = save; lockRef.current = !editor && !isNew && loadedStatus !== 'DRAFT'; editorRef.current = editor; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); if (!lockRef.current) saveRef.current(false); }
      else if (e.key === 'Enter') { e.preventDefault(); if (editorRef.current) saveRef.current(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (denied) return <div className="adm"><main className="adm-main"><div className="adm-err">ليس لديك صلاحية الوصول إلى لوحة التحكم.</div></main></div>;
  if (loading) return <div className="adm"><div className="adm-loading">جاري التحميل…</div></div>;

  // Journalists write and save drafts; publishing, scheduling and archiving are editors' calls.
  const lockedForJournalist = !editor && !isNew && loadedStatus !== 'DRAFT';

  // Templates per article kind (D-056): a structured skeleton the desk fills in; replaces the body only after confirming.
  const applyTemplate = (t: Template) => {
    if (plain(content).trim() && !confirm('استبدال المحتوى الحالي بالقالب؟')) return;
    setContent(t.html);
    setKind(t.kind);
  };

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-brand"><a href="/dashboard" className="adm-back">‹ لوحة التحكم</a></div>
        <div className="adm-actions">
          {me && <span className="adm-user">{me.name} · {ROLE_AR[me.role]}</span>}
          {!isNew && <a className="adm-link" href={loadedStatus === 'PUBLISHED' ? `/article/${id}` : `/dashboard/preview/${id}`} target="_blank" rel="noopener">معاينة ↗</a>}
          <button type="button" className="adm-logout" title="Ctrl+S" onClick={() => save(false)} disabled={saving || lockedForJournalist}>حفظ كمسودة</button>
          {editor && status === 'SCHEDULED' && <button type="button" className="adm-logout" onClick={() => save()} disabled={saving}>{saving ? '…' : 'حفظ الجدولة'}</button>}
          {editor && <button type="button" className="adm-new" title="Ctrl+Enter" onClick={() => save(true)} disabled={saving}>{saving ? '…' : 'نشر الآن'}</button>}
        </div>
      </header>

      <main className="adm-main adm-editor">
        <h1>{isNew ? 'مقال جديد' : 'تعديل المقال'}</h1>
        {!editor && <div className="adm-note">بصفتك صحفياً تُحفظ مقالاتك كمسودات، ويتولّى المحرر نشرها أو جدولتها.</div>}
        {lockedForJournalist && <div className="adm-err">هذا المقال لم يعد مسودة؛ التعديل عليه للمحررين فقط.</div>}
        {err && <div className="adm-err">{err}</div>}

        <label>العنوان<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان المقال" /></label>
        <label>الملخّص<textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="ملخّص قصير يظهر في القوائم ومعاينات المشاركة" /></label>

        <div className="adm-row">
          <label>نوع المادة
            <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              {(Object.keys(KIND_AR) as Kind[]).map((k) => <option key={k} value={k}>{KIND_AR[k]}</option>)}
            </select>
          </label>
          {kind === 'SPONSORED' && (
            <label>الجهة الممولة <small>(تظهر «إعلان» على البطاقة و«محتوى مدفوع من…» في المقال)</small>
              <input value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} maxLength={120} placeholder="اسم الجهة المعلِنة" />
            </label>
          )}
        </div>

        <div className="adm-field">
          <span className="adm-lbl">ابدأ من قالب</span>
          <div className="adm-templates">
            {TEMPLATES.map((t) => <button key={t.label} type="button" onClick={() => applyTemplate(t)} title={t.hint}>{t.label}</button>)}
          </div>
        </div>

        <div className="adm-field">
          <span className="adm-lbl">المحتوى</span>
          <RichEditor value={content} onChange={setContent} upload={uploadImage} listMedia={listMedia} deleteMedia={editor ? deleteMedia : undefined} canForceDelete={me?.role === 'ADMIN'} />
        </div>

        {kind === 'LIVE' && (!isNew && savedKind === 'LIVE'
          ? <LivePanel articleId={id} published={loadedStatus === 'PUBLISHED'} />
          : <p className="adm-hint">احفظ المادة كتغطية مباشرة ثم افتحها من جديد لإضافة التحديثات المباشرة.</p>)}

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
            {featuredImageUrl ? <img src={imgAt(featuredImageUrl, 640)} alt="" /> : <div className="ph">لا توجد صورة</div>}
            <div className="ops">
              <button type="button" className="adm-logout" onClick={() => coverRef.current?.click()} disabled={imgBusy}>{imgBusy ? 'جاري الرفع…' : 'رفع صورة'}</button>
              {featuredImageUrl && <button type="button" className="adm-logout" onClick={() => setImage('')}>إزالة</button>}
              <input value={featuredImageUrl} onChange={(e) => setImage(e.target.value)} placeholder="أو الصق رابط صورة https://…" dir="ltr" />
            </div>
          </div>
          {featuredImageUrl && (
            <div className="adm-inline">
              <input value={coverCredit} onChange={(e) => setCoverCredit(e.target.value)} maxLength={120} placeholder="مصدر الصورة — مثال: بترا، رويترز، تصوير: اسم المصوّر" aria-label="مصدر الصورة" />
              <input value={coverCaption} onChange={(e) => setCoverCaption(e.target.value)} maxLength={300} placeholder="تعليق الصورة (اختياري — يظهر العنوان إن تُرك فارغاً)" aria-label="تعليق الصورة" />
            </div>
          )}
          <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => { pickCover(e.target.files?.[0]); e.target.value = ''; }} />
        </div>

        <label>كلمات مفتاحية (SEO)<input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="الأردن، اقتصاد، عمّان" /></label>
      </main>
    </div>
  );
}
