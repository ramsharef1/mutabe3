'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminNav, { Denied } from '../components/AdminNav';
import { adminFetch, jsonInit, useStaff, EDITORS, refreshHomepage } from '../components/staff';
import { useLoadWhen } from '../../components/hooks';

interface A { id: string; title: string; status: string; publishedAt?: string | null; category?: { name: string } | null }
interface Setting { heroId: string | null; pickIds: string[]; breaking: { title: string; href: string; at: string } | null; demoBlocks?: boolean }

const MAX_PICKS = 8;

// Homepage curation: lead story, editor's picks, breaking bar (D-043 Stage 3).
// Empty choices fall back to automatic behaviour (newest story leads, default picks, no breaking bar).
export default function Homepage() {
  const { me, denied } = useStaff(EDITORS);
  const [articles, setArticles] = useState<A[]>([]);
  const [heroId, setHeroId] = useState('');
  const [pickIds, setPickIds] = useState<string[]>([]);
  const [addPick, setAddPick] = useState('');
  const [brkOn, setBrkOn] = useState(false);
  const [brkTitle, setBrkTitle] = useState('');
  const [brkHref, setBrkHref] = useState('');
  const [brkAt, setBrkAt] = useState<string | undefined>();
  const [demoOn, setDemoOn] = useState(true);
  const [samples, setSamples] = useState<{ published: number; hidden: number; total: number } | null>(null); // D-080
  const [sBusy, setSBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [ar, hr, sr] = await Promise.all([adminFetch('/api/admin/articles'), adminFetch('/api/admin/homepage'), adminFetch('/api/admin/samples')]);
    if (sr.ok) setSamples((await sr.json()).data);
    if (ar.ok) setArticles(((await ar.json()).data || []).filter((a: A) => a.status === 'PUBLISHED'));
    if (hr.ok) {
      const s = (await hr.json()).data.setting as Setting;
      setHeroId(s.heroId || '');
      setPickIds(s.pickIds || []);
      setBrkOn(!!s.breaking);
      setBrkTitle(s.breaking?.title || '');
      setBrkHref(s.breaking?.href || '');
      setBrkAt(s.breaking?.at);
      setDemoOn(s.demoBlocks !== false);
    } else setErr('تعذّر تحميل إعدادات الصفحة الرئيسية.');
    setLoading(false);
  }, []);
  useLoadWhen(!!me && !denied, load);

  const byId = useMemo(() => new Map(articles.map((a) => [a.id, a])), [articles]);
  const title = (id: string) => byId.get(id)?.title || '(مقال غير منشور أو محذوف — سيُتجاهل)';
  const move = (i: number, d: -1 | 1) => setPickIds((x) => { const j = i + d; if (j < 0 || j >= x.length) return x; const y = [...x]; [y[i], y[j]] = [y[j], y[i]]; return y; });

  const save = async () => {
    setErr(''); setOk('');
    if (brkOn && !brkTitle.trim()) { setErr('اكتب نص الخبر العاجل أو أوقف الشريط.'); return; }
    setBusy(true);
    const body = {
      heroId: heroId || null,
      pickIds,
      // keep the original time when the same breaking item is re-saved; a new title starts a new clock
      breaking: brkOn ? { title: brkTitle.trim(), href: brkHref.trim() || '/', at: brkAt } : null,
      demoBlocks: demoOn,
    };
    const r = await adminFetch('/api/admin/homepage', jsonInit('PUT', body));
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      setBrkAt(j.data?.setting?.breaking?.at);
      const fresh = await refreshHomepage();
      setOk(fresh ? 'تم الحفظ وتحديث الصفحة الرئيسية.' : 'تم الحفظ — يظهر التغيير على الصفحة الرئيسية خلال دقيقة.');
    }
    else setErr(j.error || 'تعذّر الحفظ.');
    setBusy(false);
  };

  // D-080: retire (→ draft) or restore all sample pieces at once; takes effect immediately, nothing is deleted
  const toggleSamples = async (publish: boolean) => {
    if (!publish && !window.confirm(`إخفاء ${samples?.published ?? ''} مادة تجريبية من الموقع؟ تنتقل إلى المسودات ويمكن إعادتها.`)) return;
    setErr(''); setOk(''); setSBusy(true);
    const r = await adminFetch('/api/admin/samples', jsonInit('POST', { publish }));
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setSamples(j.data); await refreshHomepage(); setOk(publish ? `أُعيد نشر ${j.data.changed} مادة تجريبية.` : `أُخفيت ${j.data.changed} مادة تجريبية — الأقسام تعرض المقالات الحقيقية فقط.`); load(); }
    else setErr(j.error || 'تعذّر التنفيذ.');
    setSBusy(false);
  };

  const opt = (a: A) => <option key={a.id} value={a.id}>{a.title}{a.category ? ` — ${a.category.name}` : ''}</option>;

  return (
    <div className="adm">
      <AdminNav me={me} />
      {denied ? <Denied /> : (
        <main className="adm-main adm-editor">
          <div className="adm-head">
            <h1>الصفحة الرئيسية</h1>
            <div className="adm-actions">
              <a className="adm-link" href="/" target="_blank" rel="noopener">عرض الرئيسية ↗</a>
              <button type="button" className="adm-new" onClick={save} disabled={busy || loading}>{busy ? '…' : 'حفظ'}</button>
            </div>
          </div>
          {ok && <div className="adm-ok">{ok}</div>}
          {err && <div className="adm-err">{err}</div>}
          {loading ? <div className="adm-loading">جاري التحميل…</div> : (<>
            <section className="adm-card">
              <h2>الخبر الرئيسي</h2>
              <p className="adm-note">الصورة الكبيرة في أعلى الصفحة. اتركه «تلقائي» ليظهر أحدث خبر منشور.</p>
              <select value={heroId} onChange={(e) => setHeroId(e.target.value)} aria-label="الخبر الرئيسي">
                <option value="">تلقائي — أحدث خبر منشور</option>
                {articles.map(opt)}
              </select>
            </section>

            <section className="adm-card">
              <h2>مختارات المحرر <small>({pickIds.length}/{MAX_PICKS})</small></h2>
              <p className="adm-note">تظهر بهذا الترتيب في صندوق «مختارات المحرر». اترك القائمة فارغة لاستخدام المختارات الافتراضية.</p>
              {pickIds.length > 0 && (
                <ol className="adm-picks">
                  {pickIds.map((id, i) => (
                    <li key={id}>
                      <span>{title(id)}</span>
                      <span className="adm-order">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="لأعلى">▲</button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === pickIds.length - 1} aria-label="لأسفل">▼</button>
                        <button type="button" onClick={() => setPickIds((x) => x.filter((y) => y !== id))} aria-label="إزالة">✕</button>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {pickIds.length < MAX_PICKS && (
                <div className="adm-inline">
                  <select value={addPick} onChange={(e) => setAddPick(e.target.value)} aria-label="إضافة مقال إلى المختارات">
                    <option value="">اختر مقالاً لإضافته…</option>
                    {articles.filter((a) => !pickIds.includes(a.id)).map(opt)}
                  </select>
                  <button type="button" className="adm-logout" disabled={!addPick} onClick={() => { setPickIds((x) => [...x, addPick]); setAddPick(''); }}>إضافة</button>
                </div>
              )}
            </section>

            <section className="adm-card">
              <h2>الكتل التوضيحية</h2>
              <p className="adm-note">أقسام الصفحة الرئيسية التي تعرض بيانات توضيحية (الأسواق، الطرق والمعابر، تصويت النواب، الوظائف والعطاءات، الذاكرة، الفيديو، صور الكتّاب…). اتركها ظاهرة حتى يصبح المحتوى الحقيقي كافياً، ثم أوقفها بنقرة واحدة؛ الأخبار والمختارات والنشرة لا تتأثر.</p>
              <label className="adm-check"><input type="checkbox" checked={demoOn} onChange={(e) => setDemoOn(e.target.checked)} /> إظهار الكتل التوضيحية على الصفحة الرئيسية</label>
              {!demoOn && <p className="adm-note">عند الحفظ تختفي الكتل التوضيحية فوراً من الموقع.</p>}
            </section>

            {samples && samples.total > 0 && (
              <section className="adm-card">
                <h2>المواد التجريبية</h2>
                <p className="adm-note">مقالات توضيحية تملأ الأقسام إلى أن ينشر التحرير. تحمل وسم «مادة تجريبية»، ولا تظهر في محركات البحث ولا في خريطة الموقع أو RSS. منشور الآن: {samples.published} · مخفي: {samples.hidden}.</p>
                <div className="adm-ops">
                  {samples.published > 0 && <button type="button" className="adm-new" disabled={sBusy} onClick={() => toggleSamples(false)}>{sBusy ? '…' : 'إخفاء كل المواد التجريبية'}</button>}
                  {samples.hidden > 0 && <button type="button" disabled={sBusy} onClick={() => toggleSamples(true)}>إعادة نشرها</button>}
                </div>
              </section>
            )}

            <section className="adm-card">
              <h2>شريط عاجل</h2>
              <label className="adm-check"><input type="checkbox" checked={brkOn} onChange={(e) => setBrkOn(e.target.checked)} /> إظهار شريط «عاجل» أعلى الصفحة الرئيسية</label>
              {brkOn && (<>
                <label>نص الخبر العاجل<input value={brkTitle} onChange={(e) => { setBrkTitle(e.target.value); setBrkAt(undefined); }} maxLength={200} placeholder="سطر واحد واضح" /></label>
                <label>الرابط
                  <select value={articles.some((a) => `/article/${a.id}` === brkHref) ? brkHref : ''} onChange={(e) => setBrkHref(e.target.value)}>
                    <option value="">رابط مخصص (اكتبه بالأسفل)</option>
                    {articles.map((a) => <option key={a.id} value={`/article/${a.id}`}>{a.title}</option>)}
                  </select>
                </label>
                <input value={brkHref} onChange={(e) => setBrkHref(e.target.value)} placeholder="/article/… أو https://…" dir="ltr" aria-label="رابط العاجل" />
              </>)}
              <p className="adm-note">عند الإيقاف يختفي الشريط ويعود شريط الأخبار إلى «آخر الأخبار».</p>
            </section>
          </>)}
        </main>
      )}
    </div>
  );
}
