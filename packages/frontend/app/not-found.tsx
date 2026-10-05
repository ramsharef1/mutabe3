import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from './components/site';

export const metadata: Metadata = { title: 'الصفحة غير موجودة | المتابع', robots: { index: false } };

// Branded 404 for unknown routes and for article URLs that are missing or not
// published (the article route calls notFound() for those).
export default function NotFound() {
  return (
    <div className="am">
      <SiteHeader />
      <div className="wrap">
        <div className="empty" style={{ margin: '60px auto', maxWidth: 560, textAlign: 'center' }}>
          <b style={{ display: 'block', fontSize: 22, marginBottom: 10 }}>المقال غير موجود</b>
          <p>ربما حُذف الخبر أو تغيّر رابطه أو لم يُنشر بعد.</p>
          <p><a href="/">العودة إلى الصفحة الرئيسية</a> · <a href="/search">ابحث في المتابع</a></p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
