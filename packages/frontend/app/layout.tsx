import type { Metadata, Viewport } from 'next';
import { Noto_Kufi_Arabic, Noto_Naskh_Arabic } from 'next/font/google';
import { fetchAds } from './lib/ads';
import { AdsProvider } from './components/ads';
import { PwaRegister } from './components/pwa';
import { Analytics } from './components/analytics';
import { GA_ID, GA_HOSTS } from './lib/ga';
import './globals.css';

// Read the id here on the server: importing a value from a 'use client' module into a server component
// yields a client-reference object (always truthy), which would emit the consent snippet unconditionally.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';

// Self-hosted via next/font (B11). Amiri is loaded only by the article page.
const kufi = Noto_Kufi_Arabic({ subsets: ['arabic'], weight: ['700'], variable: '--font-kufi', display: 'swap' });
// Only Kufi (headlines, the usual LCP text) is preloaded; Naskh loads when first used — preloading all faces
// put ~340 KB of fonts ahead of the lead image on mobile (Lighthouse, D-070). display: swap keeps text visible.
const naskh = Noto_Naskh_Arabic({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-naskh', display: 'swap', preload: false });

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
  themeColor: '#990000',
};

// Before first paint: apply the saved theme (no white flash in dark mode) and keep
// the browser's install prompt for the footer «تطبيق المتابع» button (components/pwa.tsx).
const BOOT = "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}"
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
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${kufi.variable} ${naskh.variable}`}>
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
