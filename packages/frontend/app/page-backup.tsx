'use client';

import { useEffect, useState } from 'react';

interface Article {
  id: string;
  title: string;
  summary?: string;
  content: string;
  author?: { name: string };
  category?: { name: string; slug: string };
  publishedAt?: string;
  viewsCount?: number;
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/articles');
        if (!res.ok) throw new Error('Failed to fetch articles');
        const data = await res.json();
        setArticles(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ar-JO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div>
      <section style={{ marginBottom: '40px' }}>
        <h2>آخر الأخبار</h2>
        <p style={{ color: '#666', marginBottom: '30px', fontSize: '16px' }}>
          تابع أهم الأخبار والتحديثات من الأردن والعالم
        </p>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            جاري تحميل الأخبار...
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#fee',
              color: '#c33',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            خطأ: {error}
          </div>
        )}

        {!loading && articles.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            لا توجد أخبار حالياً
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '30px',
            }}
          >
            {articles.map((article) => (
              <article
                key={article.id}
                style={{
                  background: 'white',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.transform = 'translateY(-5px)';
                  el.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.transform = 'none';
                  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                <div
                  style={{
                    height: '200px',
                    background: `linear-gradient(135deg, hsl(${Math.random() * 360}, 70%, 60%), hsl(${Math.random() * 360}, 70%, 50%))`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                  }}
                >
                  صورة الخبر
                </div>

                <div style={{ padding: '20px' }}>
                  {article.category && (
                    <span
                      style={{
                        display: 'inline-block',
                        background: '#dc2626',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        marginBottom: '10px',
                      }}
                    >
                      {article.category.name}
                    </span>
                  )}

                  <h3
                    style={{
                      margin: '10px 0',
                      fontSize: '18px',
                      color: '#1a1a1a',
                    }}
                  >
                    {article.title}
                  </h3>

                  <p
                    style={{
                      color: '#666',
                      fontSize: '14px',
                      marginBottom: '15px',
                      lineHeight: '1.6',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {article.summary || article.content?.substring(0, 150)}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: '#999',
                      borderTop: '1px solid #eee',
                      paddingTop: '10px',
                    }}
                  >
                    <span>
                      {article.author?.name || 'مُحرِّر'}
                    </span>
                    <span>
                      {formatDate(article.publishedAt)}
                    </span>
                    <span>
                      👁️ {article.viewsCount || 0}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: '60px', padding: '30px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>حول mutabe3</h3>
        <p>
          منصة أخبار أردنية حديثة تجمع بين التكنولوجيا والجودة الصحفية. نسعى لتقديم الأخبار الموثوقة والتحليلات العمقية.
        </p>
        <ul style={{ marginTop: '15px' }}>
          <li>تحديث مستمر للأخبار</li>
          <li>واجهة سهلة الاستخدام</li>
          <li>دعم كامل للغة العربية والاتجاه اليميني إلى اليساري</li>
          <li>أخبار من مختلف المجالات</li>
        </ul>
      </section>
    </div>
  );
}
