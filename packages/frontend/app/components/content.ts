import type { Article } from './site';

/* ---------- tags (derived from text until the CMS carries real tags) ---------- */
const KEYWORDS = [
  'الأردن', 'عمّان', 'الحكومة', 'البنية التحتية', 'البنك المركزي', 'الفائدة', 'الذهب', 'الاستثمار', 'الجامعة', 'ماجستير',
  'الذكاء الاصطناعي', 'وادي رم', 'السياح', 'سوريا', 'كأس آسيا', 'كرة القدم', 'المنتخب', 'كرة الطائرة', 'اليرموك', 'البحث العلمي',
  'المناخ', 'الطاقة المتجددة', 'الطاقة الشمسية', 'كهرباء', 'تطبيق', 'التجارة الإلكترونية', 'الصين', 'برج عمّان', 'موسيقى', 'دبي',
  'التصنيف العالمي', 'المعادن', 'رواد الأعمال', 'الشباب', 'كأس العالم', 'مهرجان', 'وفد', 'اجتماع عربي',
];
const norm = (s: string) => s.replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
// Also match without the definite article so «جامعة اليرموك» hits الجامعة.
const bare = (s: string) => s.replace(/(^|\s)ال/g, '$1');
const KN = KEYWORDS.map((k) => [k, norm(k), bare(norm(k))] as const);

export const tagsFor = (a: Article): string[] => {
  const txt = norm(`${a.title} ${a.summary || ''} ${a.content}`);
  const hits = KN.filter(([, n, b]) => txt.includes(n) || txt.includes(b)).map(([k]) => k);
  if (a.category?.name && !hits.includes(a.category.name)) hits.push(a.category.name);
  return hits.slice(0, 7);
};

/** Articles sharing the most tags with `a` first; same category breaks ties. */
export const relatedByTag = (a: Article, all: Article[]) => {
  const mine = new Set(tagsFor(a));
  return all
    .filter((x) => x.id !== a.id)
    .map((x) => ({ x, n: tagsFor(x).filter((t) => mine.has(t)).length + (x.category?.slug === a.category?.slug ? 0.5 : 0) }))
    .sort((p, q) => q.n - p.n)
    .map((p) => p.x);
};

/** Most frequent tags inside a list — used as the sub-filter chip row on category pages. */
export const topTags = (list: Article[], n = 6) => {
  const c = new Map<string, number>();
  list.forEach((a) => tagsFor(a).forEach((t) => { if (t !== a.category?.name) c.set(t, (c.get(t) || 0) + 1); }));
  return Array.from(c.entries()).sort((p, q) => q[1] - p[1]).slice(0, n).map(([t]) => t);
};

/* ---------- photo galleries (placeholder sets until real photos arrive) ---------- */
const POOL = [397, 1067, 410, 411, 420, 1031, 500, 322, 398, 1047, 405, 437, 369, 193, 409, 1073, 525, 364, 590, 453, 349, 388, 468, 523, 0, 3, 180, 370, 532, 445];
export const gallery = (a: Article, n = 5) => {
  const seed = parseInt(a.id.replace(/\D/g, ''), 10) || 1;
  return Array.from({ length: n }, (_, i) => ({
    src: `https://picsum.photos/id/${POOL[(seed * 7 + i * 3) % POOL.length]}/1200/800`,
    thumb: `https://picsum.photos/id/${POOL[(seed * 7 + i * 3) % POOL.length]}/400/267`,
    cap: `${a.title} — صورة ${i + 1}`,
  }));
};

/* ---------- live blog (demo entries; art-006 is the running story) ---------- */
export interface LiveEntry { at: string; title?: string; text: string; key?: boolean }
export const LIVE: Record<string, LiveEntry[]> = {
  'art-006': [
    { at: '2026-09-17T13:40:00+03:00', title: 'انتهاء الجلسة الافتتاحية', text: 'اختتمت الجلسة الافتتاحية للاجتماع العربي في عمّان بالتأكيد على وحدة الأراضي السورية، ومن المقرر أن تبدأ الجلسات المغلقة بعد قليل.', key: true },
    { at: '2026-09-17T13:05:00+03:00', text: 'وزير الخارجية: «الأردن سيواصل دوره في تقريب وجهات النظر بين الأطراف كافة».' },
    { at: '2026-09-17T12:30:00+03:00', title: 'وصول الوفود', text: 'وصلت وفود ثماني دول عربية إلى مقر الاجتماع، وسط إجراءات أمنية مشددة في محيط المنطقة.' },
    { at: '2026-09-17T12:00:00+03:00', text: 'بدأ التسجيل الإعلامي لتغطية الاجتماع، بحضور أكثر من 60 وسيلة إعلام محلية وعربية.' },
    { at: '2026-09-17T11:15:00+03:00', title: 'بدء التغطية المباشرة', text: 'يتابع موقع المتابع الاخباري تطورات الاجتماع العربي في عمّان لحظة بلحظة.' },
  ],
};
export const isLive = (id?: string) => !!(id && LIVE[id]);
export const fmtTime = (d: string) => {
  const x = new Date(d);
  return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};
