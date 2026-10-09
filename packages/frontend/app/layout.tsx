import type { Metadata, Viewport } from 'next';
import { Noto_Kufi_Arabic, Noto_Naskh_Arabic } from 'next/font/google';
import { fetchAds } from './lib/ads';
import { AdsProvider } from './components/ads';
import { PwaRegister } from './components/pwa';
import { Analytics } from './components/analytics';
import { GA_ID, GA_HOSTS } from './lib/ga';
import './globals.css';
import './skin-ink.css';

// Read the id here on the server: importing a value from a 'use client' module into a server component
// yields a client-reference object (always truthy), which would emit the consent snippet unconditionally.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';

// Self-hosted via next/font (B11). Amiri was dropped with Ink & Signal (D-089): article text is Noto Naskh in both skins.
const kufi = Noto_Kufi_Arabic({ subsets: ['arabic'], weight: ['700'], variable: '--font-kufi', display: 'swap' });
// Both faces are preloaded since D-088: under Ink & Signal, Naskh is the body and card-title face, so leaving it
// to load on first use (D-070, when classic used Arial) delayed the largest text by ~4 s on mobile. display: swap
// keeps text visible while they load.
const naskh = Noto_Naskh_Arabic({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-naskh', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const ads = await fetchAds();
  return {
    metadataBase: new URL('https://mutabe3.news'),
    title: 'موقع المتابع الاخباري',
    description: 'موقع المتابع الاخباري - آخر أخبار الأردن والعالم',
    applicationName: 'المتابع',
    openGraph: {
      title: 'موقع المتابع الاخباري',
      description: 'آخر أخبار الأردن والعالم',
      type: 'website',
    },
    // Large image previews in Google Search, Discover and Top stories (D-043 Stage 5)
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    alternates: { types: { 'application/rss+xml': '/feed.xml' } },
    appleWebApp: { capable: true, title: 'المتابع', statusBarStyle: 'default' },
    formatDetection: { telephone: false },
    // Lets AdSense verify site ownership once a publisher id is saved in /dashboard/ads
    ...(ads.adsense.client ? { other: { 'google-adsense-account': ads.adsense.client } } : {}),
  };
}

// Desktop keeps the fixed 1002px Ammon grid; under 768px globals.css switches to a single-column mobile layout.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B0B0F', // Ink & Signal is the site's look since D-088
};

// Before first paint: apply the saved theme (no white flash in dark mode) and skin, and keep
// the browser's install prompt for the footer «تطبيق المتابع» button (components/pwa.tsx).
// Ink & Signal is the default (D-088, client sign-off): <html data-skin="ink"> is rendered on the server, so
// there is no flash. ?skin=classic switches this browser back to the old red look and remembers it (for side-by-
// side checks); ?skin=ink returns to the default.
// Consent (D-088): the bar is rendered with the page; a reader who already chose (consent.v1, 12 months) gets
// <html data-consent> before paint and CSS hides the bar, so it never flashes.
const BOOT = "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}"
  + "try{var cs=JSON.parse(localStorage.getItem('consent.v1')||'null');if(cs&&typeof cs.analytics==='boolean'&&Date.now()-cs.at<31536e6)document.documentElement.dataset.consent='1'}catch(e){}"
  + "try{var q=/[?&]skin=(ink|classic)(&|$)/.exec(location.search);if(q){if(q[1]==='classic')localStorage.setItem('skin','classic');else localStorage.removeItem('skin')}"
  + "if(localStorage.getItem('skin')==='classic'){delete document.documentElement.dataset.skin;"
  + "addEventListener('DOMContentLoaded',function(){var m=document.querySelector('meta[name=theme-color]');if(m)m.content='#990000'})}}catch(e){}"
  + "addEventListener('beforeinstallprompt',function(e){window.__bip=e;dispatchEvent(new Event('mutabe3:bip'))});"
  + "addEventListener('appinstalled',function(){window.__bip=null;dispatchEvent(new Event('mutabe3:bip'))});";
// Consent Mode v2 defaults must run before the GTM container (D-055): every storage type denied until the bar grants analytics.
const CONSENT_DEFAULT = GTM_ID || GA_ID
  ? "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;"
    + "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});"
    // GA4 direct (D-074): a reader who already consented gets the config queued before any page event, so
    // article_view & co. are never sent ahead of it; gtag.js itself is added by components/analytics.tsx.
    + (GA_ID && !GTM_ID
      ? `try{var c=JSON.parse(localStorage.getItem('consent.v1')||'null');if(c&&c.analytics&&Date.now()-c.at<31536e6&&${JSON.stringify(GA_HOSTS)}.indexOf(location.hostname)>-1&&!/^\\/(dashboard|auth|offline)(\\/|$)/.test(location.pathname)){gtag('consent','update',{analytics_storage:'granted'});gtag('js',new Date());gtag('config','${GA_ID}',localStorage.getItem('accessToken')?{traffic_type:'internal'}:{});window.__gaConfigured=true}}catch(e){}`
      : '')
  : '';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ads = await fetchAds();
  return (
    <html lang="ar" dir="rtl" data-skin="ink" suppressHydrationWarning className={`${kufi.variable} ${naskh.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT + BOOT }} />
      </head>
      <body>
        <AdsProvider config={ads}>{children}</AdsProvider>
        <PwaRegister />
        <Analytics />
      </body>
    </html>
  );
}
