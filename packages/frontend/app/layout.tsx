import type { Metadata, Viewport } from 'next';
import { Noto_Kufi_Arabic, Noto_Naskh_Arabic } from 'next/font/google';
import { fetchAds } from './lib/ads';
import { AdsProvider } from './components/ads';
import { PwaRegister } from './components/pwa';
import { Analytics } from './components/analytics';
import './globals.css';
import './skin-ink.css';

// Read the id here on the server: importing a value from a 'use client' module into a server component
// yields a client-reference object (always truthy), which would emit the consent snippet unconditionally.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';

// Self-hosted via next/font (B11). Amiri is loaded only by the article page.
const kufi = Noto_Kufi_Arabic({ subsets: ['arabic'], weight: ['700'], variable: '--font-kufi', display: 'swap' });
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
  themeColor: '#990000',
};

// Before first paint: apply the saved theme (no white flash in dark mode) and skin, and keep
// the browser's install prompt for the footer «تطبيق المتابع» button (components/pwa.tsx).
// Skin preview: ?skin=ink switches this browser to Ink & Signal and remembers it, ?skin=classic switches
// back; nobody else sees a change until the skin is made the default after client sign-off.
const BOOT = "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}"
  + "try{var q=/[?&]skin=(ink|classic)(&|$)/.exec(location.search);if(q){if(q[1]==='ink')localStorage.setItem('skin','ink');else localStorage.removeItem('skin')}"
  + "if(localStorage.getItem('skin')==='ink'){document.documentElement.dataset.skin='ink';"
  + "addEventListener('DOMContentLoaded',function(){var m=document.querySelector('meta[name=theme-color]');if(m)m.content='#0B0B0F'})}}catch(e){}"
  + "addEventListener('beforeinstallprompt',function(e){window.__bip=e;dispatchEvent(new Event('mutabe3:bip'))});"
  + "addEventListener('appinstalled',function(){window.__bip=null;dispatchEvent(new Event('mutabe3:bip'))});";
// Consent Mode v2 defaults must run before the GTM container (D-055): every storage type denied until the bar grants analytics.
const CONSENT_DEFAULT = GTM_ID
  ? "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;"
    + "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});"
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
