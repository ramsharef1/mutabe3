'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { AdsConfig, AdZone, DEFAULT_ADS, needsAdsense } from './adsConfig';

// Ad slots driven by /dashboard/ads (D-043 Stage 5). The root layout reads the
// settings on the server and hands them down here, so the first HTML already
// carries the right banner or AdSense <ins> (no flash, no layout shift).
// Each zone renders: nothing (off), the built-in demo creative, one of the
// owner's banners (rotated by `variant`, like the demo set), or an AdSense unit.

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

/* ---------- demo creatives (the original placeholders, composed to look like real placements) ---------- */
const DEMO = [
  { bg: 'linear-gradient(100deg,#3b0d63,#8e44ad)', mark: '5G', markBg: '#fff', markFg: '#5e2a9a', t: 'شبكة الجيل الخامس وصلت', s: 'اشترك الآن واحصل على 100GB إضافية مجاناً', cta: 'اشترك' },
  { bg: 'linear-gradient(100deg,#8e0e0e,#e53935)', mark: 'GO', markBg: '#fff', markFg: '#b71c1c', t: 'تأجير سيارات', s: 'ابتداءً من 15 دينار / يوم — تأمين شامل', cta: 'احجز الآن' },
  { bg: 'linear-gradient(100deg,#0f4d18,#43a047)', mark: 'ب', markBg: '#fff', markFg: '#1b5e20', t: 'بنك المستقبل', s: 'حساب توفير بفائدة 5.25% سنوياً', cta: 'افتح حسابك' },
  { bg: 'linear-gradient(100deg,#c84b00,#ffb300)', mark: '%', markBg: '#fff', markFg: '#e65100', t: 'عروض الموسم', s: 'خصومات تصل إلى 50% على كل شيء', cta: 'تسوّق' },
  { bg: 'linear-gradient(100deg,#0a3d91,#1e88e5)', mark: 'ج', markBg: '#fff', markFg: '#0d47a1', t: 'الجامعة الأهلية', s: 'التسجيل مفتوح للفصل الأول 2026/2027', cta: 'سجّل الآن' },
];

/** Shared non-demo rendering for a zone: house banner or AdSense unit (null when off/unconfigured). */
function ZoneAd({ zone, variant, className, fixed }: { zone: AdZone; variant: number; className: string; fixed?: [number, number] }) {
  const { config, live } = useContext(Ctx);
  const z = config.zones[zone];
  if (z.mode === 'house') {
    const b = z.banners.length ? z.banners[variant % z.banners.length] : null;
    if (!b) return null;
    return (
      <div className={`adslot house ${className}`}>
        <a href={b.href} target="_blank" rel="sponsored noopener">
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
  const a = DEMO[variant % DEMO.length];
  return (
    <div className={`adb ${className}`} style={{ background: a.bg, ...style }}>
      <span className="tag">إعلان</span>
      <span className="mark" style={{ background: a.markBg, color: a.markFg }}>{a.mark}</span>
      <span className="txt"><b>{a.t}</b><small>{a.s}</small></span>
      <span className="cta">{a.cta}</span>
    </div>
  );
}

/** 300×250 medium rectangle for sidebars. */
export function AdBox({ variant, zone = 'sidebar' }: { variant: number; zone?: AdZone }) {
  const { config } = useContext(Ctx);
  if (config.zones[zone].mode !== 'demo') return <ZoneAd zone={zone} variant={variant} className="adslot-box" fixed={[300, 250]} />;
  const a = DEMO[variant % DEMO.length];
  return (
    <div className="adbox" style={{ background: a.bg }}>
      <span className="tag">إعلان</span>
      <span className="mark" style={{ background: a.markBg, color: a.markFg }}>{a.mark}</span>
      <b>{a.t}</b>
      <small>{a.s}</small>
      <span className="cta">{a.cta}</span>
    </div>
  );
}
