'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminNav, { Denied } from '../components/AdminNav';
import { adminFetch, jsonInit, useStaff } from '../components/staff';
import { uploadImage } from '../components/upload';
import { AdsConfig, AdZone, AdMode, HouseBanner, AD_ZONES, ZONE_INFO, MODE_LABEL, DEFAULT_ADS } from '../../components/adsConfig';

const MAX_BANNERS = 6;
const MODES: AdMode[] = ['off', 'demo', 'house', 'adsense'];

interface Uploaded { url: string; w?: number; h?: number }
/** Pixel size of an uploaded image (stored with the banner so the site can reserve its space). */
const measure = (url: string) => new Promise<Uploaded>((done) => {
  const im = new Image();
  im.onload = () => done({ url, w: im.naturalWidth || undefined, h: im.naturalHeight || undefined });
  im.onerror = () => done({ url });
  im.src = url;
});

// Ad zones, Google AdSense and ads.txt (D-043 Stage 5). Admin only.
export default function Ads() {
  const { me, denied } = useStaff(['ADMIN']);
  const [cfg, setCfg] = useState<AdsConfig>(DEFAULT_ADS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string>('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await adminFetch('/api/admin/ads');
    if (r.ok) setCfg((await r.json()).data as AdsConfig);
    else setErr('تعذّر تحميل إعدادات الإعلانات.');
    setLoading(false);
  }, []);
  useEffect(() => { if (me && !denied) load(); }, [me, denied, load]);

  const setZone = (z: AdZone, patch: Partial<AdsConfig['zones'][AdZone]>) =>
    setCfg((c) => ({ ...c, zones: { ...c.zones, [z]: { ...c.zones[z], ...patch } } }));
  const setBanner = (z: AdZone, i: number, patch: Partial<HouseBanner>) =>
    setCfg((c) => ({ ...c, zones: { ...c.zones, [z]: { ...c.zones[z], banners: c.zones[z].banners.map((b, j) => (j === i ? { ...b, ...patch } : b)) } } }));

  /** Upload a picked file and hand its URL and pixel size to `done`. */
  const pick = (key: string, done: (img: Uploaded) => void) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setErr(''); setUploading(key);
    try { done(await measure(await uploadImage(f))); } catch (x) { setErr((x as Error).message); }
    setUploading('');
  };
  const dims = (w?: number, h?: number) => (w && h ? `${w}×${h}` : '');

  const save = async () => {
    setErr(''); setOk(''); setBusy(true);
    const r = await adminFetch('/api/admin/ads', jsonInit('PUT', cfg));
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      setCfg(j.data);
      const fresh = await adminFetch('/dashboard/revalidate', jsonInit('POST', { scope: 'ads' })).then((x) => x.ok).catch(() => false);
      setOk(fresh ? 'تم الحفظ — الإعلانات محدّثة على الموقع الآن.' : 'تم الحفظ — يظهر التغيير على الموقع خلال دقيقة.');
    } else setErr(j.error || 'تعذّر الحفظ.');
    setBusy(false);
  };

  const client = cfg.adsense.client.trim();
  const demoZones = AD_ZONES.filter((z) => cfg.zones[z].mode === 'demo');
  const adsTxtPreview = [client ? `google.com, ${client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0` : '', cfg.adsTxt.trim()].filter(Boolean).join('\n');

  return (
    <div className="adm">
      <AdminNav me={me} />
      {denied ? <Denied /> : (
        <main className="adm-main adm-editor">
          <div className="adm-head">
            <h1>الإعلانات</h1>
            <div className="adm-actions">
              <a className="adm-link" href="/" target="_blank" rel="noopener">عرض الموقع ↗</a>
              <button type="button" className="adm-new" onClick={save} disabled={busy || loading || !!uploading}>{busy ? '…' : 'حفظ'}</button>
            </div>
          </div>
          {ok && <div className="adm-ok">{ok}</div>}
          {err && <div className="adm-err">{err}</div>}
          {loading ? <div className="adm-loading">جاري التحميل…</div> : (<>
            {demoZones.length > 0 && (
              <p className="adm-note">
                {demoZones.length === AD_ZONES.length ? 'كل المناطق' : demoZones.map((z) => `«${ZONE_INFO[z].label}»`).join('، ')} تعرض الإعلانات التجريبية (بنك المستقبل، تأجير سيارات…). هذه إعلانات وهمية — أوقفها أو استبدلها ببانر حقيقي أو AdSense قبل الإطلاق.
              </p>
            )}

            <section className="adm-card">
              <h2>Google AdSense</h2>
              <ol className="adm-steps">
                <li>سجّل الموقع في <a href="https://adsense.google.com" target="_blank" rel="noopener">adsense.google.com</a> وانسخ «معرّف الناشر».</li>
                <li>ضعه هنا واحفظ — يضيف الموقع وسم التحقق في كل الصفحات ويُنشئ ملف <a href="/ads.txt" target="_blank" rel="noopener" dir="ltr">ads.txt</a> تلقائياً.</li>
                <li>بعد موافقة Google: فعّل «الإعلانات التلقائية» أو أنشئ وحدات «إعلانات العرض» وضع رقم كل وحدة (data-ad-slot) في المنطقة المناسبة بالأسفل.</li>
                <li>لزوار أوروبا والمملكة المتحدة فعّل رسالة الموافقة من «الخصوصية والرسائل» في حساب AdSense.</li>
              </ol>
              <label>معرّف الناشر<input value={cfg.adsense.client} onChange={(e) => setCfg((c) => ({ ...c, adsense: { ...c.adsense, client: e.target.value.trim() } }))} placeholder="ca-pub-1234567890123456" dir="ltr" /></label>
              <label className="adm-check"><input type="checkbox" checked={cfg.adsense.auto} onChange={(e) => setCfg((c) => ({ ...c, adsense: { ...c.adsense, auto: e.target.checked } }))} /> الإعلانات التلقائية — تحميل سكربت AdSense في كل الصفحات العامة لتضع Google الإعلانات بنفسها (لا يظهر في لوحة التحكم)</label>
            </section>

            {AD_ZONES.map((z) => {
              const s = cfg.zones[z];
              const info = ZONE_INFO[z];
              return (
                <section className="adm-card" key={z}>
                  <h2>{info.label} <small dir="ltr">{info.size}</small></h2>
                  <p className="adm-sub">{info.where}</p>
                  <label>نوع الإعلان
                    <select value={s.mode} onChange={(e) => setZone(z, { mode: e.target.value as AdMode })}>
                      {MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
                    </select>
                  </label>

                  {s.mode === 'adsense' && (
                    <label>رقم الوحدة الإعلانية (data-ad-slot)
                      <input value={s.unit} onChange={(e) => setZone(z, { unit: e.target.value.replace(/\D/g, '') })} placeholder="1234567890" dir="ltr" inputMode="numeric" />
                      {!client && <small className="adm-warn">أدخل معرّف الناشر في بطاقة AdSense أولاً.</small>}
                    </label>
                  )}

                  {s.mode === 'house' && (
                    <div className="adm-banners">
                      {s.banners.length > 1 && <p className="adm-sub">تتناوب البانرات على أماكن هذه المنطقة في الصفحة.</p>}
                      {s.banners.map((b, i) => (
                        <div className="adm-banner" key={`${z}-${i}`}>
                          <div className="im">
                            <img src={b.image} alt="" />
                            {b.mobileImage && <img className="mob" src={b.mobileImage} alt="" title="صورة الموبايل" />}
                          </div>
                          {(b.w || b.mw) && <p className="adm-sub" dir="ltr">{[dims(b.w, b.h), b.mobileImage ? `mobile ${dims(b.mw, b.mh)}` : ''].filter(Boolean).join(' · ')}</p>}
                          <label>رابط الإعلان<input value={b.href} onChange={(e) => setBanner(z, i, { href: e.target.value.trim() })} placeholder="https://…" dir="ltr" /></label>
                          <label>اسم المعلن (نص بديل للصورة)<input value={b.alt} onChange={(e) => setBanner(z, i, { alt: e.target.value })} maxLength={120} /></label>
                          <div className="adm-inline wrap">
                            <label className="adm-logout">{uploading === `${z}-${i}` ? 'جاري الرفع…' : 'تغيير الصورة'}<input type="file" accept="image/*" hidden onChange={pick(`${z}-${i}`, (u) => setBanner(z, i, { image: u.url, w: u.w, h: u.h }))} /></label>
                            <label className="adm-logout">{uploading === `${z}-${i}-m` ? 'جاري الرفع…' : b.mobileImage ? 'تغيير صورة الموبايل' : 'صورة للموبايل (اختياري)'}<input type="file" accept="image/*" hidden onChange={pick(`${z}-${i}-m`, (u) => setBanner(z, i, { mobileImage: u.url, mw: u.w, mh: u.h }))} /></label>
                            {b.mobileImage && <button type="button" className="adm-logout" onClick={() => setBanner(z, i, { mobileImage: undefined, mw: undefined, mh: undefined })}>بدون صورة موبايل</button>}
                            <button type="button" className="adm-logout danger" onClick={() => setZone(z, { banners: s.banners.filter((_, j) => j !== i) })}>حذف البانر</button>
                          </div>
                        </div>
                      ))}
                      {s.banners.length < MAX_BANNERS && (
                        <label className="adm-logout adm-add">{uploading === `${z}-new` ? 'جاري الرفع…' : '+ رفع بانر'}<input type="file" accept="image/*" hidden onChange={pick(`${z}-new`, (u) => setZone(z, { banners: [...s.banners, { image: u.url, w: u.w, h: u.h, href: '', alt: '' }] }))} /></label>
                      )}
                      <p className="adm-sub">الحجم المناسب: {info.size}. JPG أو PNG أو GIF متحرّك. يفتح البانر في نافذة جديدة ويُعلَّم كرابط إعلاني لمحركات البحث.</p>
                    </div>
                  )}
                </section>
              );
            })}

            <section className="adm-card">
              <h2>ملف ads.txt</h2>
              <p className="adm-sub">سطر AdSense يُضاف تلقائياً. أضف هنا أسطر شبكات الإعلان الأخرى إن وُجدت (سطر لكل شبكة كما تعطيك إياه).</p>
              <textarea rows={4} value={cfg.adsTxt} onChange={(e) => setCfg((c) => ({ ...c, adsTxt: e.target.value }))} placeholder="example.com, pub-0000, DIRECT" dir="ltr" />
              <pre className="adm-pre" dir="ltr">{adsTxtPreview || '— لا شيء بعد: الملف غير منشور —'}</pre>
            </section>
          </>)}
        </main>
      )}
    </div>
  );
}
