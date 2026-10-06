import type { Metadata, Viewport } from 'next';
import { Noto_Kufi_Arabic, Noto_Naskh_Arabic } from 'next/font/google';
import { fetchAds } from './lib/ads';
import { AdsProvider } from './components/ads';
import { PwaRegister } from './components/pwa';
import './globals.css';

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

// Before first paint: apply the saved theme (no white flash in dark mode) and keep
// the browser's install prompt for the footer «تطبيق المتابع» button (components/pwa.tsx).
const BOOT = "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}"
  + "addEventListener('beforeinstallprompt',function(e){window.__bip=e;dispatchEvent(new Event('mutabe3:bip'))});"
  + "addEventListener('appinstalled',function(){window.__bip=null;dispatchEvent(new Event('mutabe3:bip'))});";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ads = await fetchAds();
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${kufi.variable} ${naskh.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>
        <AdsProvider config={ads}>{children}</AdsProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
