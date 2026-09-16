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
  { label: 'كتاب متابع', slug: 'writers' },
  { label: 'ليالي متابع', slug: 'nights' },
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
          <a className="logo" href="/"><b>متابع</b><small>وكالة متابع الإخبارية</small></a>
          <div className="ad ad728">إعلان 728×90</div>
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
          {['متابع الرياضي', 'متابع الصحي', 'متابع الصورة', 'متابع العلمي', 'نسخة الموبايل', 'Mutabe3 English'].map((t) => (
            <span className="ficon" key={t}><i />{t}</span>
          ))}
        </div>
        <div className="fsub">
          <a href="#">خدمة اخبار الجوال</a><a href="#">ارسل خبراً</a><a href="/category/obituaries">أخبار الوفيات</a><a href="#">خدمة RSS</a><a href="#">حول متابع</a><a href="#">اتصل بنا</a><a href="#">سياسة الخصوصية</a>
        </div>
        <div className="copy">جميع الحقوق محفوظة © وكالة متابع الإخبارية {new Date().getFullYear()} — المقالات والتعليقات المنشورة تعبر عن رأي أصحابها فقط</div>
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
