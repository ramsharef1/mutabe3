'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { AdsConfig, AdZone, DEFAULT_ADS, HouseBanner, needsAdsense } from './adsConfig';

// Ad slots driven by /dashboard/ads (D-043 Stage 5). The root layout reads the
// settings on the server and hands them down here, so the first HTML already
// carries the right banner or AdSense <ins> (no flash, no layout shift).
// Each zone renders: nothing (off), the site's own «أعلن معنا» promo (mode
// `demo`, D-089), one of the owner's banners (rotated by `variant`), or an AdSense unit.

const Ctx = createContext<{ config: AdsConfig; live: boolean }>({ config: DEFAULT_ADS, live: false });

/** Wraps the whole app. Loads Google's script only on public pages, never in the dashboard or login. */
export function AdsProvider({ config, children }: { config: AdsConfig; children: React.ReactNode }) {
  const path = usePathname() || '/';
  const live = !/^\/(dashboard|auth|offline)(\/|$)/.test(path);
  useEffect(() => {
    if (!live || !needsAdsense(config) || document.querySelector('script[data-mutabe3-ads]')) return;
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.adsense.client)}`;
    s.setAttribute('data-mutabe3-ads', '');
    document.head.appendChild(s);
  }, [live, config]);
  return <Ctx.Provider value={{ config, live }}>{children}</Ctx.Provider>;
}

/** One AdSense unit. `fixed` pins the size (header 728×90, sidebar 300×250); otherwise it is responsive. */
function AdsenseUnit({ client, unit, fixed }: { client: string; unit: string; fixed?: [number, number] }) {
  const ref = useRef<HTMLModElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.pushed) return; // React strict mode runs effects twice in dev
    el.dataset.pushed = '1';
    try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}); } catch {}
  }, []);
  return fixed ? (
    <ins ref={ref} className="adsbygoogle" style={{ display: 'inline-block', width: fixed[0], height: fixed[1] }} data-ad-client={client} data-ad-slot={unit} />
  ) : (
    <ins ref={ref} className="adsbygoogle" style={{ display: 'block', width: '100%' }} data-ad-client={client} data-ad-slot={unit} data-ad-format="auto" data-full-width-responsive="true" />
  );
}

/* ---------- «أعلن معنا»: the site's own promo for an unsold zone (D-089) ----------
 * Replaces the invented advertisers (one of them a real university) the demo mode used to show. Every line is
 * true of the product (D-053, D-056, D-057) and links to the media kit; it is not an ad, so it carries
 * «مساحة إعلانية», never «إعلان», and sends no delivery counts. */
const PROMO_BG = 'linear-gradient(100deg,#0B0B0F,#1d3f68)';
const PROMO = [
  { t: 'أعلن مع المتابع', s: 'بانرات بتواريخ بدء وانتهاء، وتقرير ظهور ونقرات لكل حملة', cta: 'تفاصيل الإعلان' },
  { t: 'هذه المساحة متاحة لإعلانك', s: 'راسلنا على ads@mutabe3.news', cta: 'اعرف أكثر' },
  { t: 'محتوى مدفوع بوسم «إعلان» واضح', s: 'للشركات والمؤسسات في الأردن', cta: 'التفاصيل' },
  { t: 'وصول إلى قرّاء الأردن', s: 'على الموبايل والكمبيوتر — بلا نوافذ منبثقة', cta: 'أعلن معنا' },
];

/* ---------- delivery beacons (D-057 / ANALYTICS-PLAN §5) ----------
 * One `view` per banner per page view once the slot has been ≥50% visible for a full second
 * (the IAB/MRC viewability floor), one `click` per click. Sent with sendBeacon so navigation
 * never waits; nothing about the reader travels with it. Never fired inside the dashboard. */
function adBeacon(zone: AdZone, bannerId: string, type: 'view' | 'click') {
  try {
    const body = JSON.stringify({ events: [{ zone, bannerId, type }] });
    if (!(navigator.sendBeacon && navigator.sendBeacon('/api/ads/ev', body))) fetch('/api/ads/ev', { method: 'POST', body, keepalive: true }).catch(() => {});
  } catch {}
}

function HouseSlot({ zone, b, className, live }: { zone: AdZone; b: HouseBanner; className: string; live: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !live || !b.id || seen.current || typeof IntersectionObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver((entries) => {
      const visible = entries[0]?.isIntersecting && document.visibilityState === 'visible';
      if (visible && !timer) {
        timer = setTimeout(() => { if (!seen.current) { seen.current = true; adBeacon(zone, b.id!, 'view'); io.disconnect(); } }, 1000);
      } else if (!visible && timer) { clearTimeout(timer); timer = null; }
    }, { threshold: 0.5 });
    io.observe(el);
    // A page opened in a background tab reports `hidden` on the first intersection; re-evaluate when it is shown.
    const onVis = () => { if (document.visibilityState === 'visible' && !seen.current) { io.unobserve(el); io.observe(el); } };
    document.addEventListener('visibilitychange', onVis);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis); if (timer) clearTimeout(timer); };
  }, [zone, b.id, live]);
  return (
    <div ref={ref} className={`adslot house ${className}`}>
      <a href={b.href} target="_blank" rel="sponsored noopener" onClick={() => { if (live && b.id) adBeacon(zone, b.id, 'click'); }}>
        <span className="tag">إعلان</span>
        <picture>
          {b.mobileImage && <source media="(max-width: 767px)" srcSet={b.mobileImage} width={b.mw} height={b.mh} />}
          {/* width/height reserve the space; without them (older entries) load eagerly so the slot can't stay 0×0 */}
          <img src={b.image} alt={b.alt || 'إعلان'} width={b.w} height={b.h} loading={b.w && zone !== 'header' ? 'lazy' : 'eager'} />
        </picture>
      </a>
    </div>
  );
}

/** Shared non-demo rendering for a zone: house banner or AdSense unit (null when off/unconfigured). */
function ZoneAd({ zone, variant, className, fixed }: { zone: AdZone; variant: number; className: string; fixed?: [number, number] }) {
  const { config, live } = useContext(Ctx);
  const z = config.zones[zone];
  if (z.mode === 'house') {
    const b = z.banners.length ? z.banners[variant % z.banners.length] : null;
    if (!b) return null; // every scheduled banner of this zone is outside its dates → the slot collapses
    return <HouseSlot zone={zone} b={b} className={className} live={live} />;
  }
  if (z.mode === 'adsense' && config.adsense.client && z.unit) {
    return (
      <div className={`adslot gads ${className}`}>
        <span className="tag">إعلان</span>
        {/* drafts previewed inside the dashboard never request real ads */}
        {live ? <AdsenseUnit client={config.adsense.client} unit={z.unit} fixed={fixed} /> : <span className="gads-ph">Google AdSense</span>}
      </div>
    );
  }
  return null;
}

/** Horizontal banner (header leaderboard, rows between sections, after the article). */
export function AdBanner({ variant, className = '', style, zone = 'inline' }: { variant: number; className?: string; style?: React.CSSProperties; zone?: AdZone }) {
  const { config } = useContext(Ctx);
  if (config.zones[zone].mode !== 'demo') return <ZoneAd zone={zone} variant={variant} className={className} fixed={zone === 'header' ? [728, 90] : undefined} />;
  const a = PROMO[variant % PROMO.length];
  return (
    <a href="/advertise" className={`adb promo ${className}`} style={{ background: PROMO_BG, ...style }}>
      <span className="tag">مساحة إعلانية</span>
      <span className="mark">م</span>
      <span className="txt"><b>{a.t}</b><small>{a.s}</small></span>
      <span className="cta">{a.cta}</span>
    </a>
  );
}

/** 300×250 medium rectangle for sidebars. */
export function AdBox({ variant, zone = 'sidebar' }: { variant: number; zone?: AdZone }) {
  const { config } = useContext(Ctx);
  if (config.zones[zone].mode !== 'demo') return <ZoneAd zone={zone} variant={variant} className="adslot-box" fixed={[300, 250]} />;
  const a = PROMO[variant % PROMO.length];
  return (
    <a href="/advertise" className="adbox promo" style={{ background: PROMO_BG }}>
      <span className="tag">مساحة إعلانية</span>
      <span className="mark">م</span>
      <b>{a.t}</b>
      <small>{a.s}</small>
      <span className="cta">{a.cta}</span>
    </a>
  );
}
