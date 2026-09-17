'use client';

import { useEffect, useState } from 'react';

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

export function Img({ src, alt = '' }: { src?: string; alt?: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) return <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#c9c9c9,#8f8f8f)' }} />;
  return <img src={src} alt={alt} loading="lazy" onError={() => setErr(true)} />;
}

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/articles')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setArticles(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return { articles, loading };
}

export const Loading = () => <div className="am loading">جاري تحميل الأخبار...</div>;

// Vector re-creation of the المتابع wordmark: black geometric Kufi with the microphone medallion.
const LogoMark = () => (
  <svg viewBox="0 0 330 100" aria-label="المتابع" role="img">
    <text x="322" y="80" direction="rtl" textAnchor="start" fontFamily="'Noto Kufi Arabic', 'Noto Naskh Arabic', Arial, sans-serif" fontSize="74" fontWeight="900" fill="#111">المتابع</text>
    <g transform="translate(200 50)">
      <circle r="31" fill="#fff" stroke="#111" strokeWidth="2.5" />
      <rect x="-9" y="-25" width="18" height="27" rx="9" fill="#111" />
      <rect x="-15" y="-5" width="30" height="13" fill="#2e6db4" />
      <path d="M-5 9 L5 9 L0 27 Z" fill="#111" />
    </g>
  </svg>
);

const ADS = [
  { bg: 'linear-gradient(90deg,#4a1d75,#8e44ad)', t: 'شبكة الجيل الخامس', s: 'اشترك الآن واحصل على 100GB إضافية', en: '5G' },
  { bg: 'linear-gradient(90deg,#b71c1c,#e53935)', t: 'تأجير سيارات', s: 'ابتداءً من 15 دينار / يوم', cta: 'احجز الآن' },
  { bg: 'linear-gradient(90deg,#1b5e20,#43a047)', t: 'بنك المستقبل', s: 'حسابات التوفير بأعلى فائدة', cta: 'افتح حسابك' },
  { bg: 'linear-gradient(90deg,#e65100,#ffb300)', t: 'عروض الموسم', s: 'خصومات تصل إلى 50% على كل شيء', cta: 'تسوّق' },
  { bg: 'linear-gradient(90deg,#0d47a1,#1e88e5)', t: 'الجامعة الأهلية', s: 'التسجيل مفتوح للفصل الأول 2026/2027', cta: 'سجّل الآن' },
];

export function AdBanner({ variant, className = '', style }: { variant: number; className?: string; style?: React.CSSProperties }) {
  const a = ADS[variant % ADS.length];
  return (
    <div className={`adb ${className}`} style={{ background: a.bg, ...style }}>
      {a.en && <span className="en">{a.en}</span>}
      <span>{a.t}</span>
      <small>{a.s}</small>
      {a.cta && <span className="cta">{a.cta}</span>}
    </div>
  );
}

export function SiteHeader() {
  return (
    <>
      <div className="topmenu">
        <div className="wrap">
          <div className="links">
            <a href="/">الرئيسية</a><a href="#">ارسل لنا</a><a href="#">اتصل بنا</a><a href="#">البحث</a><a href="#">حول الموقع</a><a href="#">أخبار اليوم</a>
          </div>
          <div className="weather">
            <span className="city">عمّان<br />الآن</span>
            <span className="deg">24°</span>
            <span>☀</span>
            <span className="city">المزيد ▾</span>
            <span className="en">ENGLISH</span>
          </div>
        </div>
      </div>
      <div className="wrap">
        <div className="nav">
          <ul>{NAV.map((n) => <li key={n.slug}><a href={`/category/${n.slug}`}>{n.label}</a></li>)}</ul>
        </div>
        <div className="brand">
          <a className="logo" href="/"><LogoMark /><small>الاخباري</small></a>
          <AdBanner variant={0} className="ad728" />
        </div>
      </div>
    </>
  );
}

export function SiteFooter() {
  return (
    <div className="footer">
      <div className="wrap">
        <div className="ficons">
          {['المتابع الرياضي', 'المتابع الصحي', 'المتابع الصورة', 'المتابع العلمي', 'نسخة الموبايل', 'Almutabe3 English'].map((t) => (
            <span className="ficon" key={t}><i />{t}</span>
          ))}
        </div>
        <div className="fsub">
          <a href="#">خدمة اخبار الجوال</a><a href="#">ارسل خبراً</a><a href="/category/obituaries">أخبار الوفيات</a><a href="#">خدمة RSS</a><a href="#">حول المتابع</a><a href="#">اتصل بنا</a><a href="#">سياسة الخصوصية</a>
        </div>
        <div className="copy">جميع الحقوق محفوظة © موقع المتابع الاخباري {new Date().getFullYear()} — المقالات والتعليقات المنشورة تعبر عن رأي أصحابها فقط</div>
        <div className="social"><i /><i /><i /><i /></div>
        <div className="host">برمجة واستضافة mutabe3.news</div>
      </div>
    </div>
  );
}

export const SecHd = ({ t, slug }: { t: string; slug?: string }) => (
  <div className="hd"><i /><b>{slug ? <a href={`/category/${slug}`}>{t}</a> : t}</b></div>
);

export const More = ({ slug }: { slug?: string }) => (
  <div className="more"><a href={slug ? `/category/${slug}` : '#'}><span>المزيد</span></a></div>
);

export function Sidebar({ articles }: { articles: Article[] }) {
  const [tab, setTab] = useState(0);
  const list = tab === 0
    ? articles.slice(0, 13)
    : [...articles].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 13);
  return (
    <div className="sidec">
      <div className="tabs">
        <span className={tab === 0 ? 'on' : ''} onClick={() => setTab(0)}>اخر التحديثات</span>
        <span className={tab === 1 ? 'on' : ''} onClick={() => setTab(1)}>الأكثر مشاهدة</span>
      </div>
      <div className="sidebox">
        {list.map((a) => (
          <a key={a.id} className="sm" href={`/article/${a.id}`}>
            <div className="th"><Img src={a.featuredImageUrl} /></div>
            <div className="t">{a.title}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
