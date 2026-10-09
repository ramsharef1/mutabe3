'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { liveNow } from './content';
import { AudioPill } from './blocks/jordan';
import { AdBanner, AdBox } from './ads';
import { InstallApp } from './pwa';
import { PushToggle } from './push';

export * from './util';
import { Article, NAV, WRITERS, face, ago, catColor } from './util';
import { imgAt, srcSetFor } from './img';
import { PrivacySettingsLink } from './analytics';
import { useHtmlAttr } from './hooks';

/* ---------- navigation from the DB (D-043 Stage 3) ---------- */
export interface NavItem { label: string; slug: string; description?: string | null }
let navCache: NavItem[] | null = null;
let navPending: Promise<NavItem[] | null> | null = null;
/**
 * Header/footer categories as managed in /dashboard/categories (showInNav, displayOrder).
 * First render uses the built-in NAV so server and client markup match; the DB list
 * replaces it after mount and is cached for the rest of the page's life.
 */
const navSubs = new Set<() => void>();
const subscribeNav = (cb: () => void) => {
  navSubs.add(cb);
  navPending ??= fetch('/api/categories')
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((d) => {
      const list: NavItem[] = (d.data || [])
        .filter((c: any) => c.showInNav !== false)
        .map((c: any) => ({ label: c.name, slug: c.slug, description: c.description }));
      if (list.length) { navCache = list; navSubs.forEach((f) => f()); }
      return list.length ? list : null;
    })
    .catch(() => null);
  return () => { navSubs.delete(cb); };
};
// D-085: an external store instead of setState in an effect — the server and hydration see NAV, then the DB list.
export function useNav(): NavItem[] {
  return useSyncExternalStore(subscribeNav, () => navCache ?? NAV, () => NAV);
}

/**
 * Site image. Editor uploads get resized WebP derivatives with a 640/960 srcset (1280 too for
 * the hero/lead) from /api/img (D-045); other sources render untouched. Errors step down:
 * derivative → untouched master → grey placeholder, so a converter hiccup never blanks a card.
 */
export function Img({ src, alt = '', priority = false, sizes }: { src?: string; alt?: string; priority?: boolean; sizes?: string }) {
  const [fallback, setFallback] = useState(0);
  if (!src || fallback > 1) return <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#c9c9c9,#8f8f8f)' }} />;
  const set = fallback === 0 ? srcSetFor(src, priority ? [640, 960, 1280] : [640, 960]) : undefined;
  return (
    <img
      src={set ? imgAt(src, priority ? 960 : 640) : src}
      srcSet={set}
      sizes={set ? sizes || (priority ? '(max-width: 1024px) 100vw, 960px' : '(max-width: 768px) 100vw, 640px') : undefined}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      onError={() => setFallback((f) => f + 1)}
    />
  );
}

// Sponsored material carries the law's word «إعلان» on every card (Press & Publications Law Art. 30(b); REVENUE-MAP §3, D-056).
// Sample material (D-080) says so on every card, ahead of any other label.
export const Chip = ({ a }: { a: Article }) =>
  a.isSample
    ? <span className="chip sample">مادة تجريبية</span>
    : a.kind === 'SPONSORED'
    ? <span className="chip sponsored">إعلان</span>
    : a.kind === 'OPINION'
      ? <span className="chip opinion">رأي</span>
      : liveNow(a)
        ? <span className="chip islive"><i />مباشر</span>
        : a.category ? <span className="chip" style={{ background: catColor(a.category.slug) }}>{a.category.name}</span> : null;

/* ---------- theme (light = Ammon default; dark persisted in localStorage) ---------- */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const dark = useHtmlAttr('data-theme') === 'dark'; // D-085: follows <html data-theme>, set before paint
  const flip = () => {
    const d = !dark;
    document.documentElement.dataset.theme = d ? 'dark' : 'light';
    try { localStorage.setItem('theme', d ? 'dark' : 'light'); } catch {}
  };
  return (
    <button type="button" className={`theme ${className}`} onClick={flip} title={dark ? 'الوضع النهاري' : 'الوضع الليلي'} aria-label="تبديل المظهر">
      {dark ? Ico.sun : Ico.moon}<span>{dark ? 'نهاري' : 'ليلي'}</span>
    </button>
  );
}

/** Site-wide latest list for header/sidebar/related. Pages that fetched it on the server pass it as `initial`,
 *  which skips the browser fetch (and the empty first paint it caused, D-070). */
export function useArticles(initial?: Article[]) {
  const [articles, setArticles] = useState<Article[]>(initial || []);
  const [loading, setLoading] = useState(!initial);
  useEffect(() => {
    if (initial) return;
    fetch('/api/articles')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setArticles(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initial]);
  return { articles, loading };
}

export const Loading = () => <div className="am loading">جاري تحميل الأخبار...</div>;

/* ---------- ads: zones configured in /dashboard/ads (D-043 Stage 5) ---------- */
export { AdBanner, AdBox };

/* ---------- icons ---------- */
const P = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden><path d={d} /></svg>;
export const Ico = {
  search: <P d="M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />,
  fb: <P d="M14 8h3V4h-3c-2.8 0-4.5 1.7-4.5 4.5V11H7v4h2.5v7h4v-7H17l.5-4h-4V9c0-.6.3-1 .5-1z" />,
  x: <P d="M17.5 3h3.2l-7 8 8.3 10h-6.5l-5-6.6L4.6 21H1.4l7.5-8.6L1 3h6.6l4.6 6.1L17.5 3zm-1.1 16.1h1.8L6.7 4.8H4.8l11.6 14.3z" />,
  ig: <P d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM21 7.6c-.1-1.7-.5-3.2-1.7-4.4C18.1 2 16.6 1.6 14.9 1.5 13.1 1.4 10.9 1.4 9.1 1.5 7.4 1.6 5.9 2 4.7 3.2 3.5 4.4 3.1 5.9 3 7.6c-.1 1.8-.1 4 0 5.8.1 1.7.5 3.2 1.7 4.4 1.2 1.2 2.7 1.6 4.4 1.7 1.8.1 4 .1 5.8 0 1.7-.1 3.2-.5 4.4-1.7 1.2-1.2 1.6-2.7 1.7-4.4.1-1.8.1-4 0-5.8zm-2 7.1c-.2 1.2-.6 2-1.3 2.7-.7.7-1.5 1.1-2.7 1.3-1.5.2-4.5.2-6 0-1.2-.2-2-.6-2.7-1.3-.7-.7-1.1-1.5-1.3-2.7-.2-1.5-.2-4.5 0-6 .2-1.2.6-2 1.3-2.7.7-.7 1.5-1.1 2.7-1.3 1.5-.2 4.5-.2 6 0 1.2.2 2 .6 2.7 1.3.7.7 1.1 1.5 1.3 2.7.2 1.5.2 4.5 0 6z" />,
  yt: <P d="M23 7.2c-.3-1-1-1.8-2-2C19.2 4.7 12 4.7 12 4.7s-7.2 0-9 .5c-1 .3-1.8 1-2 2C.5 9 .5 12 .5 12s0 3 .5 4.8c.3 1 1 1.8 2 2 1.8.5 9 .5 9 .5s7.2 0 9-.5c1-.3 1.8-1 2-2 .5-1.8.5-4.8.5-4.8s0-3-.5-4.8zM9.7 15.1V8.9l6 3.1-6 3.1z" />,
  tg: <P d="M21.9 4.4 18.8 19c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.8-8c.4-.3-.1-.5-.6-.2L6.8 12.9l-4.7-1.5c-1-.3-1-1 .2-1.5L20.6 3c.9-.3 1.6.2 1.3 1.4z" />,
  wa: <P d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.6.7.5-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.2-.7-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.3c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.3 8.3 0 1 1 12 20.3z" />,
  link: <P d="M3.9 12a3.1 3.1 0 0 1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12zM8 13h8v-2H8v2zm9-6h-4v1.9h4a3.1 3.1 0 0 1 0 6.2h-4V17h4a5 5 0 0 0 0-10z" />,
  print: <P d="M19 8h-1V3H6v5H5a3 3 0 0 0-3 3v6h4v4h12v-4h4v-6a3 3 0 0 0-3-3zM8 5h8v3H8V5zm8 14H8v-4h8v4zm2-4v-2H6v2H4v-4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4h-2z" />,
  clock: <P d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />,
  eye: <P d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />,
  home: <P d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />,
  chev: <P d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z" />,
  menu: <P d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />,
  play: <P d="M8 5v14l11-7z" />,
  moon: <P d="M12 3a9 9 0 1 0 9 9c0-.5 0-.9-.1-1.3A5.5 5.5 0 0 1 13.3 3.1C12.9 3 12.5 3 12 3z" />,
  sun: <P d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5h0l1 3h-2l1-3zm0 20 1-3h-2l1 3zM2 12l3-1v2l-3-1zm20 0-3 1v-2l3 1zM4.9 4.9l2.8 1.4-1.4 1.4-1.4-2.8zm14.2 14.2-2.8-1.4 1.4-1.4 1.4 2.8zM4.9 19.1l1.4-2.8 1.4 1.4-2.8 1.4zM19.1 4.9l-1.4 2.8-1.4-1.4 2.8-1.4z" />,
};

/* ---------- header ---------- */
export function Nav({ compact = false }: { compact?: boolean }) {
  const path = usePathname() || '/';
  const nav = useNav();
  const items = compact ? nav.slice(0, 9) : nav;
  return (
    <ul>
      {items.map((n) => {
        const on = path.startsWith(`/category/${n.slug}`);
        return <li key={n.slug} className={on ? 'on' : ''}><a href={`/category/${n.slug}`} aria-current={on ? 'page' : undefined}>{n.label}</a></li>;
      })}
    </ul>
  );
}

function StickyBar() {
  const [on, setOn] = useState(false);
  // `inert` while hidden: aria-hidden alone left its links in the tab order (Lighthouse aria-hidden-focus, D-070).
  // Set as a DOM property — React 18 has no boolean `inert` attribute.
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => { if (bar.current) (bar.current as HTMLElement & { inert: boolean }).inert = !on; }, [on]);
  useEffect(() => {
    const f = () => setOn(window.scrollY > 320);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <div ref={bar} className={`sticky ${on ? 'show' : ''}`} aria-hidden={!on}>
      <div className="wrap">
        <a className="slogo" href="/"><img src="/logo.svg" alt="المتابع" /></a>
        <nav className="snav" aria-label="الأقسام"><Nav compact /></nav>
        <form className="sq" action="/search" role="search">
          <input name="q" placeholder="بحث..." aria-label="بحث" />
          <button type="submit" aria-label="بحث">{Ico.search}</button>
        </form>
        <ThemeToggle className="ico" />
      </div>
    </div>
  );
}

export function SiteHeader({ articles = [], temp, wxLabel }: { articles?: Article[]; temp?: number; wxLabel?: string }) {
  return (
    <>
      <StickyBar />
      <div className="topmenu">
        <div className="wrap">
          <div className="links">
            <a href="/">الرئيسية</a><a href="/category/politics">أخبار اليوم</a><a href="https://wa.me/962790000000" target="_blank" rel="noopener">ارسل خبراً</a><a href="#footer">اتصل بنا</a><a href="#footer">حول الموقع</a>
          </div>
          <div className="weather">
            {articles.length > 0 && <AudioPill articles={articles} />}
            <form className="tsq" action="/search" role="search"><input name="q" placeholder="ابحث في المتابع…" aria-label="بحث" /><button type="submit" aria-label="بحث">{Ico.search}</button></form>
            <span className="city">عمّان<br />{wxLabel || 'الآن'}</span>
            <span className="deg">{temp ?? 24}°</span>
            <span className="en">ENGLISH</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
      <div className="wrap">
        <nav className="nav" aria-label="الأقسام الرئيسية">
          <Nav />
        </nav>
        <div className="brand">
          <a className="logo" href="/"><img src="/logo.svg" alt="المتابع" width="338" height="134" /><small>الاخباري</small></a>
          <form className="msq" action="/search" role="search"><input name="q" placeholder="ابحث في المتابع…" aria-label="بحث" /><button type="submit" aria-label="بحث">{Ico.search}</button></form>
          <AdBanner variant={0} className="ad728" zone="header" />
        </div>
      </div>
    </>
  );
}

/** Breadcrumb trail used on inner pages: الرئيسية › القسم › (العنوان). */
export function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="crumbs" aria-label="مسار التصفح">
      <a href="/">{Ico.home}<span>الرئيسية</span></a>
      {items.map((c, i) => (
        <span key={i}><i>{Ico.chev}</i>{c.href ? <a href={c.href}>{c.label}</a> : <b>{c.label}</b>}</span>
      ))}
    </nav>
  );
}

/* ---------- footer ---------- */
export function SiteFooter() {
  const nav = useNav();
  return (
    <div className="footer" id="footer">
      <div className="wrap">
        <div className="fbrands">
          <a className="flogo" href="/"><img src="/logo-white.svg" alt="المتابع" /></a>
          <div className="ficons">
            {['المتابع الرياضي', 'المتابع الصحي', 'المتابع الصورة', 'المتابع العلمي'].map((t) => (
              <a href="#" className="ficon" key={t}><i /><span>{t}</span></a>
            ))}
            <InstallApp />
            <PushToggle />
            <a href="#" className="ficon"><i /><span>Almutabe3 English</span></a>
          </div>
        </div>
        <div className="fcols">
          <div>
            <b>الأقسام</b>
            <ul>{nav.slice(0, 7).map((n) => <li key={n.slug}><a href={`/category/${n.slug}`}>{n.label}</a></li>)}</ul>
          </div>
          <div>
            <b>المزيد</b>
            <ul>{nav.slice(7).map((n) => <li key={n.slug}><a href={`/category/${n.slug}`}>{n.label}</a></li>)}</ul>
          </div>
          <div>
            <b>خدمات</b>
            <ul>
              <li><a href="/about#app">خدمة اخبار الجوال</a></li><li><a href="/contact#tip">ارسل خبراً</a></li><li><a href="/category/obituaries">أخبار الوفيات</a></li>
              <li><a href="/feed.xml">خدمة RSS</a></li><li><a href="/#newsletter">النشرة البريدية</a></li>
            </ul>
          </div>
          <div>
            <b>عن المتابع</b>
            <ul>
              <li><a href="/about">حول المتابع</a></li><li><a href="/contact">اتصل بنا</a></li><li><a href="/advertise">أعلن معنا</a></li>
              <li><a href="/privacy">سياسة الخصوصية</a></li><li><a href="/terms">شروط الاستخدام</a></li>
              <li><a href="/corrections">التصحيح وحق الرد</a></li><li><a href="/editorial-policy">السياسة التحريرية</a></li>
              <PrivacySettingsLink />
            </ul>
            <div className="social">
              <a href="#" title="فيسبوك" className="fb">{Ico.fb}</a>
              <a href="#" title="X" className="x">{Ico.x}</a>
              <a href="#" title="انستغرام" className="ig">{Ico.ig}</a>
              <a href="#" title="يوتيوب" className="yt">{Ico.yt}</a>
              <a href="#" title="تيليغرام" className="tg">{Ico.tg}</a>
              <a href="#" title="واتساب" className="wa">{Ico.wa}</a>
            </div>
          </div>
        </div>
        <div className="copy">جميع الحقوق محفوظة © موقع المتابع الاخباري {new Date().getFullYear()} — المقالات والتعليقات المنشورة تعبر عن رأي أصحابها فقط</div>
        <div className="host">برمجة واستضافة mutabe3.news</div>
      </div>
    </div>
  );
}

export const SecHd = ({ t, slug, meta, tabs, cls = '' }: { t: string; slug?: string; meta?: string; tabs?: string[]; cls?: string }) => (
  <div className={`hd ${cls}`}>
    <b>{slug ? <a href={`/category/${slug}`}>{t}</a> : t}</b><i aria-hidden />
    {tabs && <span className="tabs2" role="tablist">{tabs.map((x, i) => <button type="button" role="tab" aria-selected={i === 0} key={x} className={i === 0 ? 'on' : ''}>{x}</button>)}</span>}
    {meta && <span className="meta">{meta}</span>}
  </div>
);

export const More = ({ slug }: { slug?: string }) => (
  <div className="more"><a href={slug ? `/category/${slug}` : '#'}><span>المزيد</span></a></div>
);

/* ---------- share row (article page) ---------- */
export function ShareRow({ title, compact = false }: { title: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : 'https://mutabe3.news';
  const enc = encodeURIComponent;
  const copy = () => {
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <div className={`sharerow ${compact ? 'compact' : ''}`}>
      <a className="wa" href={`https://wa.me/?text=${enc(title + ' ' + url)}`} target="_blank" rel="noopener" title="واتساب">{Ico.wa}<span>واتساب</span></a>
      <a className="fb" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener" title="فيسبوك">{Ico.fb}<span>فيسبوك</span></a>
      <a className="x" href={`https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`} target="_blank" rel="noopener" title="X">{Ico.x}<span>X</span></a>
      <a className="tg" href={`https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`} target="_blank" rel="noopener" title="تيليغرام">{Ico.tg}<span>تيليغرام</span></a>
      <button type="button" className="ln" onClick={copy} title="نسخ الرابط">{Ico.link}<span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span></button>
      <button type="button" className="pr" onClick={() => window.print()} title="طباعة">{Ico.print}<span>طباعة</span></button>
    </div>
  );
}

/* ---------- sidebar (inner pages) ---------- */
export function Sidebar({ articles }: { articles: Article[] }) {
  const [tab, setTab] = useState(0);
  const list = tab === 0
    ? articles.slice(0, 10)
    : [...articles].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 10);
  return (
    <div className="sidec">
      <div className="tabs">
        <span className={tab === 0 ? 'on' : ''} onClick={() => setTab(0)}>اخر التحديثات</span>
        <span className={tab === 1 ? 'on' : ''} onClick={() => setTab(1)}>الأكثر مشاهدة</span>
      </div>
      <div className="sidebox">
        {list.map((a, i) => (
          <a key={a.id} className={`sm ${tab === 1 ? 'ranked' : ''}`} href={`/article/${a.id}`}>
            {tab === 1 ? <span className="rank">{i + 1}</span> : <div className="th"><Img src={a.featuredImageUrl} /></div>}
            <div className="t">
              {a.title}
              <span className="meta">{tab === 1 ? <>{Ico.eye}{a.viewsCount ?? 0}</> : <>{Ico.clock}{ago(a.publishedAt)}</>}</span>
            </div>
          </a>
        ))}
      </div>
      <AdBox variant={2} />
      <div className="sidebox trending">
        <div className="hd"><b>الأكثر تداولاً</b><i /></div>
        <ul className="arr">{articles.slice(10, 16).map((a) => <li key={a.id}><a href={`/article/${a.id}`}>{a.title}</a></li>)}</ul>
      </div>
      <AdBox variant={4} />
    </div>
  );
}
