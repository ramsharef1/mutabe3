import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <h2>أهلاً بك في mutabe3</h2>
      <p>منصة أخبار أردنية حديثة لنشر ومشاركة الأخبار.</p>

      <section style={{ marginTop: '40px' }}>
        <h3>الميزات:</h3>
        <ul>
          <li>نشر الأخبار بسهولة</li>
          <li>واجهة حديثة وسهلة الاستخدام</li>
          <li>دعم كامل للغة العربية</li>
          <li>محرك بحث قوي</li>
        </ul>
      </section>

      <section style={{ marginTop: '30px', padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>الخطوات التالية:</h3>
        <p>يمكنك الآن:</p>
        <ul>
          <li><Link href="/api/health">فحص حالة API</Link></li>
          <li>تصفح الأخبار (قريباً)</li>
          <li>تسجيل الدخول (قريباً)</li>
        </ul>
      </section>

      <section style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        <h4>معلومات النظام:</h4>
        <p>
          Frontend: Vercel (Next.js 14) <br />
          Backend: VPS (Node.js + Express) <br />
          Database: PostgreSQL <br />
          Cache: Redis <br />
          CMS: Strapi (قريباً) <br />
          <br />
          <strong>API Test:</strong> <br />
          <code style={{display: 'block', padding: '10px', background: '#f5f5f5'}}>
            <a href="/api/health" target="_blank">GET /api/health</a>
          </code>
        </p>
      </section>
    </div>
  );
}
