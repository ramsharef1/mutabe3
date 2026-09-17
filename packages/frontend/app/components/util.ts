// Pure data + helpers shared by server and client components (no 'use client' here).

export interface Article {
  id: string;
  slug?: string;
  title: string;
  summary?: string;
  content: string;
  category?: { name: string; slug: string };
  publishedAt?: string;
  viewsCount?: number;
  featuredImageUrl?: string;
}

export const WRITERS = [
  'د. هاني الخصاونة',
  'م. ليلى العبادي',
  'أ. فارس الزعبي',
  'د. سناء المجالي',
  'خالد الرواشدة',
  'د. ريم النعيمات',
  'ياسر الحياري',
  'د. عمر الطراونة',
  'رنا الشوابكة',
  'د. محمود العجارمة',
  'سهى الحمود',
  'أ. باسم الخريشا',
];

export const NAV: { label: string; slug: string }[] = [
  { label: 'اخبار الاردن', slug: 'politics' },
  { label: 'شرق وغرب', slug: 'east-west' },
  { label: 'اقتصاد', slug: 'economy' },
  { label: 'تعليم و جامعات', slug: 'education' },
  { label: 'العالم', slug: 'world' },
  { label: 'فلسطين', slug: 'palestine' },
  { label: 'البرلمان', slug: 'parliament' },
  { label: 'بانوراما', slug: 'panorama' },
  { label: 'كتاب المتابع', slug: 'writers' },
  { label: 'ليالي المتابع', slug: 'nights' },
  { label: 'صحة وبيئة', slug: 'health' },
  { label: 'كاريكاتير', slug: 'caricature' },
  { label: 'فيديو', slug: 'video' },
];

export const CAT_LABELS: Record<string, string> = {
  ...Object.fromEntries(NAV.map((n) => [n.slug, n.label])),
  sports: 'رياضة',
  harak: 'حراك',
  opinion: 'آراء',
  viewpoint: 'وجهة نظر',
  press: 'صحفة',
  debate: 'نقاش',
  diwan: 'ديوان',
  selected: 'مقالات مختارة',
  culture: 'الثقافة',
  jobs: 'وظائف',
  sectors: 'قطاعات',
  accidents: 'حوادث',
  obituaries: 'وفيات',
  letters: 'رسالة الى المحرر',
  technology: 'تكنولوجيا وسيارات',
  misc: 'منوعات',
};

// One-line blurb shown under the category title on /category pages.
export const CAT_DESC: Record<string, string> = {
  politics: 'آخر الأخبار المحلية والقرارات الحكومية وشؤون المملكة',
  economy: 'الأسواق والبنوك والاستثمار والطاقة في الأردن والمنطقة',
  sports: 'المنتخبات والأندية والدوري الأردني والبطولات العربية والعالمية',
  education: 'الجامعات والمدارس والتعليم العالي والبعثات',
  world: 'أبرز التطورات الدولية من عواصم العالم',
  palestine: 'متابعة يومية للشأن الفلسطيني',
  parliament: 'مجلس النواب والأعيان واللجان والتشريعات',
  health: 'الصحة العامة والبيئة والمناخ',
};

const CAT_COLORS: Record<string, string> = {
  politics: '#990000',
  economy: '#1b5e20',
  sports: '#0d47a1',
  education: '#6a1b9a',
  world: '#37474f',
  palestine: '#2e7d32',
  parliament: '#4e342e',
  health: '#00838f',
  technology: '#283593',
  culture: '#ad1457',
};
export const catColor = (slug?: string) => (slug && CAT_COLORS[slug]) || '#990000';

export const face = (i: number) => `https://i.pravatar.cc/140?img=${(i % 60) + 5}`;

export const fmtDate = (d?: string) => {
  const x = d ? new Date(d) : new Date();
  const dd = String(x.getDate()).padStart(2, '0');
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  let h = x.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${dd}-${mm}-${x.getFullYear()} ${String(h).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')} ${ap}`;
};

// Relative time in Arabic ("منذ 3 ساعات"). Western digits, matching the rest of the site.
export const ago = (d?: string) => {
  if (!d) return '';
  const m = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 60) return m === 1 ? 'منذ دقيقة' : m === 2 ? 'منذ دقيقتين' : m <= 10 ? `منذ ${m} دقائق` : `منذ ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? 'منذ ساعة' : h === 2 ? 'منذ ساعتين' : h <= 10 ? `منذ ${h} ساعات` : `منذ ${h} ساعة`;
  const dd = Math.round(h / 24);
  return dd === 1 ? 'منذ يوم' : dd === 2 ? 'منذ يومين' : dd <= 10 ? `منذ ${dd} أيام` : `منذ ${dd} يوماً`;
};

export const readMins = (text: string) => Math.max(1, Math.round(text.split(/\s+/).length / 180));
