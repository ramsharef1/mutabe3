import type { Metadata, Viewport } from 'next';
import { Noto_Kufi_Arabic, Noto_Naskh_Arabic } from 'next/font/google';
import './globals.css';

// Self-hosted via next/font (B11). Amiri is loaded only by the article page.
const kufi = Noto_Kufi_Arabic({ subsets: ['arabic'], weight: ['700'], variable: '--font-kufi', display: 'swap' });
const naskh = Noto_Naskh_Arabic({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-naskh', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://mutabe3.news'),
  title: 'موقع المتابع الاخباري',
  description: 'موقع المتابع الاخباري - آخر أخبار الأردن والعالم',
  openGraph: {
    title: 'موقع المتابع الاخباري',
    description: 'آخر أخبار الأردن والعالم',
    type: 'website',
  },
};

// Desktop keeps the fixed 1002px Ammon grid; under 768px globals.css switches to a single-column mobile layout.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${kufi.variable} ${naskh.variable}`}>
      <head>
        {/* Apply the saved theme before first paint so dark mode doesn't flash white */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
