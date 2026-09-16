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

  const categories = ['شرق وغرب', 'اقتصاد', 'البرلمان', 'ملاحظات', 'كتاب عمون', 'لبالي عمون', 'صحة وبيئة'];
  const breakingNews = articles.slice(0, 6);
  const mainArticles = articles.slice(0, 10);

  return (
    <div style={{ direction: 'rtl', textAlign: 'right', background: '#f5f0e8', fontFamily: 'Arial, sans-serif', margin: '0', padding: '0' }}>
      {/* Top Red Header */}
      <div style={{ background: '#8B0000', color: 'white', padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderBottom: '1px solid #666' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <span>تابعنا</span>
          <span>البحث</span>
          <span>حول الموقع</span>
          <span>أخبار اليوم</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span>ENGLISH</span>
          <span>|</span>
          <span>عربي</span>
          <span>☀️</span>
          <span>25°</span>
        </div>
      </div>

      {/* Category Navigation */}
      <div style={{ background: '#ddd', borderBottom: '2px solid #8B0000', display: 'flex', direction: 'rtl' }}>
        {categories.map((cat, idx) => (
          <div
            key={cat}
            style={{
              padding: '10px 20px',
              borderRight: idx < categories.length - 1 ? '1px solid #999' : 'none',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#333',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#ccc')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {cat}
          </div>
        ))}
      </div>

      {/* Logo Section */}
      <div style={{ background: 'white', padding: '20px', textAlign: 'center', borderBottom: '2px solid #8B0000' }}>
        <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>وكالة</div>
        <h1 style={{ fontSize: '48px', margin: '0', color: '#8B0000', fontWeight: 'bold' }}>
          عمون الاخبارية
        </h1>
      </div>

      {/* Featured Articles Row (Top Featured Stories) */}
      {articles.length > 0 && (
        <div style={{ background: 'white', padding: '15px', borderBottom: '2px solid #8B0000', display: 'flex', gap: '20px', direction: 'rtl' }}>
          {articles.slice(0, 3).map((article, idx) => (
            <div
              key={article.id}
              style={{
                flex: 1,
                borderRight: idx < 2 ? '1px solid #ddd' : 'none',
                paddingRight: idx < 2 ? '20px' : '0',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', direction: 'rtl' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#333', lineHeight: '1.4', fontWeight: 'bold' }}>
                    {article.title}
                  </h3>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    {article.publishedAt && new Date(article.publishedAt).toLocaleDateString('ar-JO')}
                  </div>
                </div>
                <div
                  style={{
                    width: '80px',
                    height: '70px',
                    background: `linear-gradient(135deg, hsl(${Math.random() * 360}, 70%, 60%), hsl(${Math.random() * 360}, 70%, 50%))`,
                    borderRadius: '2px',
                    flexShrink: 0,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Advertisement Banner */}
      <div style={{ background: 'white', padding: '10px', borderBottom: '2px solid #8B0000', display: 'flex', gap: '10px', height: '80px' }}>
        <div style={{ flex: 1, background: '#f0f0f0', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#999' }}>
          [إعلان]
        </div>
      </div>

      {/* Main Content: Sidebar + Articles */}
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
        <tr>
          {/* Left Sidebar - Breaking News */}
          <td
            style={{
              width: '25%',
              borderLeft: '2px solid #8B0000',
              padding: '15px 10px',
              verticalAlign: 'top',
              background: '#f5f5f5',
            }}
          >
            <div style={{ borderBottom: '2px solid #8B0000', marginBottom: '10px', paddingBottom: '8px' }}>
              <div style={{ background: '#8B0000', color: 'white', padding: '8px 10px', marginBottom: '10px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center' }}>
                ⚡ اخر الاخبار
              </div>
            </div>
            <div>
              {breakingNews.map((article) => (
                <div
                  key={article.id}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid #ddd',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    cursor: 'pointer',
                    color: '#333',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#8B0000')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#333')}
                >
                  • {article.title.substring(0, 40)}...
                </div>
              ))}
            </div>

            {/* Sections */}
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #ddd' }}>
              <div style={{ background: '#8B0000', color: 'white', padding: '8px 10px', marginBottom: '10px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center' }}>
                📋 وظائف
              </div>
              <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                فرص وظيفية متاحة في مختلف المجالات
              </div>
            </div>
          </td>

          {/* Right Main Content */}
          <td style={{ padding: '15px 20px', verticalAlign: 'top' }}>
            {/* Large Featured Article */}
            {articles.length > 0 && (
              <div
                style={{
                  background: '#f9f9f9',
                  border: '2px solid #8B0000',
                  padding: '15px',
                  marginBottom: '20px',
                  display: 'flex',
                  gap: '15px',
                  direction: 'rtl',
                }}
              >
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#8B0000', lineHeight: '1.4', fontWeight: 'bold' }}>
                    {articles[0].title}
                  </h2>
                  <p style={{ margin: '8px 0', fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                    {articles[0].summary || articles[0].content.substring(0, 150)}...
                  </p>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    {articles[0].publishedAt && new Date(articles[0].publishedAt).toLocaleDateString('ar-JO')}
                  </div>
                </div>
                <div
                  style={{
                    width: '200px',
                    height: '150px',
                    background: `linear-gradient(135deg, hsl(${Math.random() * 360}, 70%, 60%), hsl(${Math.random() * 360}, 70%, 50%))`,
                    borderRadius: '2px',
                    flexShrink: 0,
                  }}
                />
              </div>
            )}

            {/* Articles Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              {mainArticles.slice(1).map((article) => (
                <div
                  key={article.id}
                  style={{
                    background: '#f9f9f9',
                    border: '1px solid #ddd',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#8B0000')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#ddd')}
                >
                  <div style={{ display: 'flex', gap: '12px', direction: 'rtl' }}>
                    <div
                      style={{
                        width: '90px',
                        height: '90px',
                        background: `linear-gradient(135deg, hsl(${Math.random() * 360}, 70%, 60%), hsl(${Math.random() * 360}, 70%, 50%))`,
                        borderRadius: '2px',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '13px', lineHeight: '1.3', color: '#333', fontWeight: 'bold' }}>
                        {article.title}
                      </h3>
                      {article.category && (
                        <span style={{ display: 'inline-block', background: '#8B0000', color: 'white', padding: '3px 8px', borderRadius: '2px', fontSize: '10px', marginBottom: '6px' }}>
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
          </td>
        </tr>
      </table>

      {/* Footer */}
      <div style={{ background: '#8B0000', color: 'white', padding: '20px', textAlign: 'center', fontSize: '12px', marginTop: '30px' }}>
        <p style={{ margin: '5px 0' }}>© 2026 وكالة mutabe3 الاخبارية. جميع الحقوق محفوظة</p>
        <p style={{ margin: '5px 0' }}>تابعنا على وسائل التواصل الاجتماعي</p>
      </div>
    </div>
  );
}
