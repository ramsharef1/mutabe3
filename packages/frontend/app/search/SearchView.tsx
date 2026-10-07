'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Article, Img, useArticles, Loading, SiteHeader, SiteFooter, Sidebar, Crumbs, Chip, ago, Ico, excerpt } from '../components/site';
import { topTags } from '../components/content';

function SearchInner() {
  const q = (useSearchParams().get('q') || '').trim();
  const { articles, loading } = useArticles();
  const [results, setResults] = useState<Article[] | null>(null); // null = fetching
  const [term, setTerm] = useState(q);

  useEffect(() => {
    setTerm(q);
    if (!q) { setResults([]); return; }
    setResults(null);
    fetch(`/api/articles?q=${encodeURIComponent(q)}&take=50`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setResults(d.data || []))
      .catch(() => setResults([]));
  }, [q]);

  if (loading) return <Loading />;
  const suggestions = topTags(articles, 8);

  return (
    <div className="am">
      <SiteHeader articles={articles} />
      <div className="wrap">
        <div className="inner">
          <div className="mainc">
            <Crumbs items={q ? [{ label: 'بحث', href: '/search' }, { label: q }] : [{ label: 'بحث' }]} />

            <form className="srch" action="/search" role="search">
              <input name="q" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="ابحث في المتابع…" aria-label="بحث" autoFocus={!q} />
              <button type="submit">{Ico.search}<span>بحث</span></button>
            </form>

            {q && (
              <div className="cathead taghead">
                <div>
                  <small>نتائج البحث عن</small>
                  <h1>«{q}»</h1>
                  {results && <p>{results.length ? `${results.length} نتيجة` : 'لا نتائج مطابقة'}</p>}
                </div>
                {results && <div className="catnum"><b>{results.length}</b><small>خبر</small></div>}
              </div>
            )}

            {results === null ? (
              <div className="loading" style={{ padding: '40px 0' }}>جاري البحث…</div>
            ) : results.length === 0 ? (
              <div className="empty">
                <b>{q ? `لا توجد نتائج لـ «${q}»` : 'اكتب كلمة للبحث في أخبار المتابع'}</b>
                {suggestions.length > 0 && (
                  <div className="tags" style={{ marginTop: 14 }}>
                    <span>{q ? 'جرّب:' : 'الأكثر تداولاً:'}</span>
                    {suggestions.map((t) => <a key={t} href={`/search?q=${encodeURIComponent(t)}`}>{t}</a>)}
                  </div>
                )}
              </div>
            ) : (
              <div className="catlist">
                {results.map((a) => (
                  <a key={a.id} className="ci" href={`/article/${a.id}`}>
                    <div className="th"><Img src={a.featuredImageUrl} /><Chip a={a} /></div>
                    <div className="t">
                      <span className="ttl">{a.title}</span>
                      <span className="ex">{excerpt(a)}</span>
                      <span className="tm">{Ico.clock}{ago(a.publishedAt)}<em>·</em>{Ico.eye}{a.viewsCount ?? 0}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
          <Sidebar articles={articles} />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

export default function SearchView() {
  return <Suspense fallback={<Loading />}><SearchInner /></Suspense>;
}
