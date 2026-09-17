import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'وكالة متابع الإخبارية',
  description: 'وكالة متابع الإخبارية - آخر أخبار الأردن والعالم',
  openGraph: {
    title: 'وكالة متابع الإخبارية',
    description: 'آخر أخبار الأردن والعالم',
    type: 'website',
  },
};

// Ammon serves its fixed 1002px desktop page to phones (shrink-to-fit); match that until a mobile edition exists.
// initial-scale must be absent (not 1) or phones won't scale the page down to fit.
export const viewport: Viewport = {
  width: 1024,
  initialScale: null as unknown as number,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&family=Noto+Kufi+Arabic:wght@700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
