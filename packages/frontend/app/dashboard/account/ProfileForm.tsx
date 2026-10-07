'use client';

// «ملفي العام» (D-067): the signed-in staff member's public author page — photo, job title, bio and the
// page address. Saved through PUT /api/admin/profile; the photo goes through the normal upload route
// (re-encoded to WebP), so only images stored on this site can appear on /author/<slug>.
import { useEffect, useRef, useState } from 'react';
import { adminFetch, jsonInit } from '../components/staff';
import { uploadImage } from '../components/upload';

interface Profile { id: string; name: string; slug: string | null; jobTitle: string | null; bio: string | null; photoUrl: string | null }

export default function ProfileForm() {
  const [p, setP] = useState<Profile | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [bio, setBio] = useState('');
  const [slug, setSlug] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const fill = (d: Profile) => { setP(d); setJobTitle(d.jobTitle || ''); setBio(d.bio || ''); setSlug(d.slug || ''); setPhotoUrl(d.photoUrl || ''); };

  useEffect(() => {
    adminFetch('/api/admin/profile').then((r) => (r.ok ? r.json() : null)).then((j) => j?.data && fill(j.data)).catch(() => setErr('تعذّر تحميل الملف العام.'));
  }, []);

  const pick = async (f?: File | null) => {
    if (!f) return;
    setErr(''); setMsg(''); setBusy(true);
    try { setPhotoUrl(await uploadImage(f)); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
    if (file.current) file.current.value = '';
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setMsg(''); setBusy(true);
    try {
      const r = await adminFetch('/api/admin/profile', jsonInit('PUT', { jobTitle, bio, slug, photoUrl }));
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErr(j.error || 'تعذّر الحفظ.');
      else { fill(j.data); setMsg('تم حفظ الملف العام.'); }
    } catch { setErr('تعذّر الاتصال.'); }
    setBusy(false);
  };

  if (!p) return err ? <div className="adm-err">{err}</div> : null;
  const href = p.slug ? `/author/${encodeURIComponent(p.slug)}` : '';
  return (
    <section className="adm-profile">
      <h1>ملفي العام</h1>
      <p className="adm-hint">يظهر تحت عنوان كل مقال تنشره. صفحة الكاتب تظهر للقراء فقط بعد تعبئة «الصفة» ونشر أول مقال لك؛ اترك الصفة فارغة إذا كان هذا حساباً مشتركاً للتحرير.</p>
      {msg && <div className="adm-ok">{msg}</div>}
      {err && <div className="adm-err">{err}</div>}
      <form onSubmit={save}>
        <div className="adm-photo">
          <div className="face">{photoUrl ? <img src={photoUrl} alt="" /> : <span className="au-init" aria-hidden>{p.name.trim()[0]}</span>}</div>
          <div>
            <b>{p.name}</b>
            <div className="adm-ops">
              <button type="button" onClick={() => file.current?.click()} disabled={busy}>{photoUrl ? 'تغيير الصورة' : 'رفع صورة'}</button>
              {photoUrl && <button type="button" onClick={() => setPhotoUrl('')} disabled={busy}>إزالة الصورة</button>}
            </div>
            <small>صورة شخصية مربعة. بدون صورة يظهر الحرف الأول من الاسم.</small>
            <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </div>
        </div>
        <label>الصفة<input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={80} placeholder="مثال: كاتب صحفي، محرر الشؤون البرلمانية" /></label>
        <label>نبذة<textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={800} rows={5} placeholder="سطران أو ثلاثة عن خبرتك ومجالات كتابتك" /></label>
        <label>رابط الصفحة<input value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={60} dir="auto" /></label>
        <small className="adm-hint"><bdi dir="ltr">mutabe3.news/author/{slug || '…'}</bdi> — تغييره يُبطل الروابط القديمة إلى صفحتك.</small>
        <div className="adm-ops">
          <button type="submit" className="adm-new" disabled={busy}>{busy ? '…' : 'حفظ الملف العام'}</button>
          {href && p.jobTitle && <a href={href} target="_blank" rel="noopener">عرض صفحتي</a>}
        </div>
      </form>
    </section>
  );
}
