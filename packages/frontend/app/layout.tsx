import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'mutabe3 - أخبار الأردن',
  description: 'منصة أخبار أردنية شاملة',
  viewport: 'width=device-width, initial-scale=1',
  openGraph: {
    title: 'mutabe3',
    description: 'منصة أخبار أردنية',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <header style={{ background: '#1a1a1a', color: 'white', padding: '20px' }}>
          <h1 style={{ margin: 0 }}>mutabe3 • أخبار الأردن</h1>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
            منصة أخبار أردنية
          </p>
        </header>
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          {children}
        </main>
        <footer style={{ background: '#f5f5f5', padding: '20px', marginTop: '40px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            © 2026 mutabe3. جميع الحقوق محفوظة
          </p>
        </footer>
      </body>
    </html>
  );
}
