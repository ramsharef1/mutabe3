import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'وكالة متابع الإخبارية',
  description: 'وكالة متابع الإخبارية - آخر أخبار الأردن والعالم',
  openGraph: {
    title: 'وكالة متابع الإخبارية',
    description: 'آخر أخبار الأردن والعالم',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: '#fff', fontFamily: 'Arial, Tahoma, sans-serif' }}>{children}</body>
    </html>
  );
}
