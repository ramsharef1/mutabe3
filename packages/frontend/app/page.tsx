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
  featuredImageUrl?: string;
}

const PlaceholderImage = ({ seed }: { seed: string }) => {
  const hues = [0, 30, 60, 120, 180, 240, 300];
  const hue = hues[seed.charCodeAt(0) % hues.length];
  return (
    <div
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${(hue + 60) % 360}, 70%, 50%))`,
        width: '100%',
        height: '100%',
      }}
    />
  );
};

const ArticleImage = ({ url, seed }: { url?: string; seed: string }) => {
  if (!url) return <PlaceholderImage seed={seed} />;
  return (
    <img
      src={url}
      alt="Article thumbnail"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        e.currentTarget.parentElement!.innerHTML = '<div style="width:100%;height:100%;background:linear-gradient(135deg,hsl(240,70%,60%),hsl(300,70%,50%))"></div>';
      }}
    />
  );
};

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

  if (loading || articles.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>جاري تحميل الأخبار...</div>;
  }

  return (
    <div style={{ direction: 'rtl', textAlign: 'right', fontFamily: "'Arial', sans-serif", background: '#f0ebe4', margin: 0, padding: 0 }}>
      {/* Top Header */}
      <div style={{ background: '#8B0000', color: 'white', padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', borderBottom: '1px solid #666' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <span>اشترك معنا</span>
          <span>|</span>
          <span>اتصل بنا</span>
          <span>|</span>
          <span>سياسة الخصوصية</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span>ENGLISH</span>
          <span>|</span>
          <span>عربي</span>
        </div>
      </div>

      {/* Navigation Bar */}
      <div style={{ background: '#f5f5f5', borderBottom: '2px solid #8B0000', padding: '0' }}>
        <div style={{ display: 'flex', direction: 'rtl', maxWidth: '1200px', margin: '0 auto' }}>
          {['سياسية', 'اقتصاد', 'رياضة', 'تكنولوجيا', 'ثقافة', 'عالم', 'تعليم', 'بيئة'].map((cat, i) => (
            <div
              key={cat}
              style={{
                padding: '12px 20px',
                borderLeft: i < 7 ? '1px solid #ddd' : 'none',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#333',
                cursor: 'pointer',
                background: 'white',
                flex: 1,
                textAlign: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#efefef')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>

      {/* Logo & Title */}
      <div style={{ background: 'white', padding: '25px', textAlign: 'center', borderBottom: '3px solid #8B0000', marginBottom: '15px' }}>
        <div style={{ fontSize: '13px', color: '#999', marginBottom: '8px' }}>وكالة أنباء أردنية</div>
        <h1 style={{ fontSize: '52px', margin: '0 0 5px 0', color: '#8B0000', fontWeight: 'bold', letterSpacing: '2px' }}>
          mutabe3
        </h1>
        <p style={{ margin: '0', color: '#666', fontSize: '14px', fontWeight: '500' }}>منصة أخبار أردنية شاملة</p>
      </div>

      {/* Featured Article (Large) */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 15px 15px' }}>
        <div style={{ display: 'flex', gap: '15px', background: 'white', border: '3px solid #8B0000', borderRadius: '2px', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ width: '35%', height: '300px', overflow: 'hidden' }}>
            <ArticleImage url={articles[0].featuredImageUrl} seed={articles[0].id} />
          </div>
          <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>
              {articles[0].category && (
                <span style={{ background: '#8B0000', color: 'white', padding: '3px 8px', borderRadius: '2px', marginLeft: '8px' }}>
                  {articles[0].category.name}
                </span>
              )}
            </div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', lineHeight: '1.4', color: '#8B0000', fontWeight: 'bold' }}>
              {articles[0].title}
            </h2>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', lineHeight: '1.6', color: '#555' }}>
              {articles[0].summary || articles[0].content.substring(0, 150)}...
            </p>
            <div style={{ fontSize: '11px', color: '#999' }}>
              {articles[0].publishedAt && new Date(articles[0].publishedAt).toLocaleDateString('ar-JO')}
              {articles[0].viewsCount && ` • ${articles[0].viewsCount} مشاهدة`}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 15px', display: 'flex', gap: '15px', marginBottom: '30px' }}>
        {/* Left Sidebar */}
        <div style={{ width: '25%' }}>
          {/* Breaking News */}
          <div style={{ background: 'white', marginBottom: '15px', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ background: '#8B0000', color: 'white', padding: '10px 15px', fontWeight: 'bold', fontSize: '13px' }}>
              ⚡ آخر الأخبار
            </div>
            {articles.slice(1, 7).map((article) => (
              <div
                key={article.id}
                style={{
                  padding: '12px 15px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: '#333',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9f9f9';
                  e.currentTarget.style.color = '#8B0000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#333';
                }}
              >
                • {article.title}
              </div>
            ))}
          </div>

          {/* Ads Space */}
          <div style={{ background: '#e8e8e8', height: '250px', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '12px', marginBottom: '15px' }}>
            [إعلان]
          </div>

          {/* Jobs Section */}
          <div style={{ background: 'white', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ background: '#8B0000', color: 'white', padding: '10px 15px', fontWeight: 'bold', fontSize: '13px' }}>
              📋 وظائف
            </div>
            <div style={{ padding: '15px', fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
              فرص وظيفية متاحة في مختلف القطاعات والتخصصات
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* 2-Column Grid - Section 1 */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{ background: '#8B0000', color: 'white', padding: '10px 15px', fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', borderRadius: '2px' }}>
              أهم الأخبار
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {articles.slice(1, 5).map((article) => (
                <div
                  key={article.id}
                  style={{
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                >
                  <div style={{ width: '100%', height: '150px', overflow: 'hidden' }}>
                    <ArticleImage url={article.featuredImageUrl} seed={article.id} />
                  </div>
                  <div style={{ padding: '12px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', lineHeight: '1.4', fontWeight: 'bold', color: '#333' }}>
                      {article.title}
                    </h3>
                    {article.category && (
                      <span style={{ display: 'inline-block', background: '#8B0000', color: 'white', padding: '3px 8px', borderRadius: '2px', fontSize: '10px', marginBottom: '6px', marginRight: '5px' }}>
                        {article.category.name}
                      </span>
                    )}
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>
                      {article.publishedAt && new Date(article.publishedAt).toLocaleDateString('ar-JO')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3-Column Grid - Section 2 */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{ background: '#8B0000', color: 'white', padding: '10px 15px', fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', borderRadius: '2px' }}>
              أخبار متنوعة
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              {articles.slice(5, 11).map((article) => (
                <div
                  key={article.id}
                  style={{
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#8B0000')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#ddd')}
                >
                  <div style={{ width: '100%', height: '120px', overflow: 'hidden' }}>
                    <ArticleImage url={article.featuredImageUrl} seed={article.id} />
                  </div>
                  <div style={{ padding: '10px' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', lineHeight: '1.3', fontWeight: 'bold', color: '#333' }}>
                      {article.title}
                    </h4>
                    <div style={{ fontSize: '10px', color: '#999' }}>
                      {article.publishedAt && new Date(article.publishedAt).toLocaleDateString('ar-JO')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4-Column Grid - Section 3 */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{ background: '#8B0000', color: 'white', padding: '10px 15px', fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', borderRadius: '2px' }}>
              في الصحف
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {articles.slice(11, 19).map((article) => (
                <div
                  key={article.id}
                  style={{
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ width: '100%', height: '100px', overflow: 'hidden' }}>
                    <ArticleImage url={article.featuredImageUrl} seed={article.id} />
                  </div>
                  <div style={{ padding: '8px' }}>
                    <h5 style={{ margin: '0', fontSize: '11px', lineHeight: '1.3', fontWeight: 'bold', color: '#333' }}>
                      {article.title.substring(0, 30)}...
                    </h5>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#8B0000', color: 'white', padding: '25px', textAlign: 'center', fontSize: '12px', marginTop: '30px', borderTop: '3px solid #600' }}>
        <p style={{ margin: '0 0 10px 0' }}>© 2026 وكالة mutabe3 الاخبارية. جميع الحقوق محفوظة</p>
        <p style={{ margin: '0', fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
          البريد الإلكتروني: info@mutabe3.news | الهاتف: +962-6-1234567
        </p>
      </div>
    </div>
  );
}
