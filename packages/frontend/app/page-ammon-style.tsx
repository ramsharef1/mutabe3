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

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/articles');
        if (!res.ok) throw new Error('Failed to fetch articles');
        const data = await res.json();
        setArticles(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const categories = ['سياسية', 'اقتصاد', 'رياضة', 'تكنولوجيا', 'ثقافة', 'عالم'];

  return (
    <div style={{ direction: 'rtl', textAlign: 'right', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#8B0000', color: 'white', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
          <span>🔍 البحث</span>
          <span>حول الموقع</span>
          <span>أخبار اليوم</span>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span>ENGLISH</span>
          <span>|</span>
          <span>عربي</span>
          <span>25°</span>
          <span>☀️</span>
        </div>
      </div>

      {/* Logo & Title */}
      <div style={{ background: 'white', padding: '20px', textAlign: 'center', borderBottom: '3px solid #8B0000' }}>
        <h1 style={{ fontSize: '48px', margin: '0', color: '#8B0000', fontWeight: 'bold' }}>
          mutabe3 • أخبار الأردن
        </h1>
        <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>منصة أخبار أردنية حديثة</p>
      </div>

      {/* Category Navigation */}
      <div style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '0', padding: '0' }}>
          {categories.map((cat) => (
            <div
              key={cat}
              style={{
                padding: '12px 20px',
                borderLeft: '1px solid #ddd',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#333',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#e0e0e0')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: '20px', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Sidebar - Breaking News */}
        <div style={{ width: '250px' }}>
          <div style={{ background: '#8B0000', color: 'white', padding: '10px', marginBottom: '10px', fontWeight: 'bold' }}>
            ⚡ أخر الأخبار
          </div>
          <div>
            {articles.slice(0, 5).map((article) => (
              <div
                key={article.id}
                style={{
                  padding: '10px',
                  borderBottom: '1px solid #ddd',
                  cursor: 'pointer',
                  fontSize: '13px',
                  lineHeight: '1.4',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9f9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {article.title}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ flex: 1 }}>
          {/* Featured Article */}
          {articles.length > 0 && (
            <div
              style={{
                background: 'white',
                border: '2px solid #8B0000',
                padding: '15px',
                marginBottom: '20px',
                display: 'flex',
                gap: '15px',
              }}
            >
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#8B0000', lineHeight: '1.4' }}>
                  {articles[0].title}
                </h2>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '13px' }}>
                  {articles[0].summary || articles[0].content.substring(0, 100)}...
                </p>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                  {articles[0].publishedAt && new Date(articles[0].publishedAt).toLocaleDateString('ar-JO')}
                </div>
              </div>
              <div
                style={{
                  width: '150px',
                  height: '120px',
                  background: `linear-gradient(135deg, hsl(${Math.random() * 360}, 70%, 60%), hsl(${Math.random() * 360}, 70%, 50%))`,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  flexShrink: 0,
                }}
              >
                صورة
              </div>
            </div>
          )}

          {/* Articles Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            {articles.map((article) => (
              <div
                key={article.id}
                style={{
                  background: 'white',
                  border: '1px solid #ddd',
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      background: `linear-gradient(135deg, hsl(${Math.random() * 360}, 70%, 60%), hsl(${Math.random() * 360}, 70%, 50%))`,
                      borderRadius: '3px',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', lineHeight: '1.3', color: '#333' }}>
                      {article.title}
                    </h3>
                    {article.category && (
                      <span style={{ display: 'inline-block', background: '#8B0000', color: 'white', padding: '2px 6px', borderRadius: '3px', fontSize: '11px', marginBottom: '5px' }}>
                        {article.category.name}
                      </span>
                    )}
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {article.publishedAt && new Date(article.publishedAt).toLocaleDateString('ar-JO')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f5f5f5', borderTop: '3px solid #8B0000', padding: '20px', textAlign: 'center', marginTop: '30px', fontSize: '13px', color: '#666' }}>
        <p>© 2026 mutabe3. جميع الحقوق محفوظة</p>
        <p>تابعنا على وسائل التواصل الاجتماعي</p>
      </div>
    </div>
  );
}
