import type { Article } from './site';
import { plain } from './util';

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
  const txt = norm(`${a.title} ${a.summary || ''} ${plain(a.content)}`);
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
export interface LiveEntry { id?: string; at: string; title?: string | null; text: string; key?: boolean }
// Demo timestamps are relative to load time so the running story reads as
// genuinely recent (real entries will carry real times from the CMS).
const agoISO = (min: number) => new Date(Date.now() - min * 60000).toISOString();
export const LIVE: Record<string, LiveEntry[]> = {
  // Sample entries (D-091): what a running story looks like — no event, quote or official presented as real.
  'art-006': [
    { at: agoISO(14), title: 'مثال: تحديث بعنوان', text: 'مثال على تحديث في تغطية مباشرة — يظهر الأحدث أولاً مع وقته، ويُبرَز المهم منها.', key: true },
    { at: agoISO(49), text: 'مثال: تصريح منسوب إلى صاحبه مع رابط مصدره.' },
    { at: agoISO(94), title: 'مثال: تطور جديد', text: 'مثال على تحديث يضيف معلومة أو صورة إلى القصة.' },
    { at: agoISO(169), title: 'بدء التغطية', text: 'مثال: هكذا تبدأ التغطية المباشرة — مادة تجريبية تُستبدل بتغطية حقيقية عند أول قصة مباشرة.' },
  ],
};
export const isLive = (id?: string) => !!(id && LIVE[id]);
/** Coverage running now: a LIVE article not yet ended (D-068), or the demo story while it is seeded. */
export const liveNow = (a?: { id?: string; kind?: string; liveEndedAt?: string | null } | null) =>
  !!a && ((a.kind === 'LIVE' && !a.liveEndedAt) || isLive(a.id));
// Newsroom clock (Amman), the same on the server and in every reader's browser — so server-rendered
// times hydrate without a mismatch (D-070) and readers abroad see the desk's time, as the dashboard does.
const AMMAN_HM = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Amman' });
export const fmtTime = (d: string) => AMMAN_HM.format(new Date(d));
