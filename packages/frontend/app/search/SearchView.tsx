'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Article, Img, useArticles, Loading, SiteHeader, SiteFooter, Sidebar, Crumbs, Chip, ago, Ico, excerpt } from '../components/site';
import { topTags } from '../components/content';

function SearchInner() {
  const q = (useSearchParams().get('q') || '').trim();
  const { articles, loading } = useArticles();
  // D-085: the answer remembers which query it belongs to; a new q reads as "searching" until its own answer
  // arrives, and the box shows q until the reader types — no state is reset inside an effect.
  const [answer, setAnswer] = useState<{ q: string; results: Article[]; notice: string; dym: string } | null>(null);
  const [typed, setTyped] = useState<{ q: string; v: string } | null>(null);
  const term = typed && typed.q === q ? typed.v : q;
  const setTerm = (v: string) => setTyped({ q, v });
  const mine = answer && answer.q === q ? answer : null;
  const results: Article[] | null = !q ? [] : mine ? mine.results : null; // null = fetching
  const notice = mine?.notice || ''; // e.g. the API's rate-limit message (D-064) — not "no results"
  const didYouMean = mine?.dym || ''; // «هل تقصد…» from the API when nothing matched (D-071)

  useEffect(() => {
    if (!q) return;
    fetch(`/api/articles?q=${encodeURIComponent(q)}&take=50`)
      .then(async (r) => {
        if (r.status === 429) return { data: [], notice: (await r.json().catch(() => ({}))).error || 'عمليات بحث كثيرة — حاول بعد دقيقة' };
        return r.ok ? r.json() : Promise.reject();
      })
      .then((d) => setAnswer({ q, results: d.data || [], notice: d.notice || '', dym: d.suggest || '' }))
      .catch(() => setAnswer({ q, results: [], notice: '', dym: '' }));
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
                  {results && !notice && <p>{results.length ? `${results.length} نتيجة` : 'لا نتائج مطابقة'}</p>}
                </div>
                {results && !notice && <div className="catnum"><b>{results.length}</b><small>خبر</small></div>}
              </div>
            )}

            {results === null ? (
              <div className="loading" style={{ padding: '40px 0' }}>جاري البحث…</div>
            ) : results.length === 0 ? (
              <div className="empty" role={notice ? 'status' : undefined}>
                <b>{notice || (q ? `لا توجد نتائج لـ «${q}»` : 'اكتب كلمة للبحث في أخبار المتابع')}</b>
                {didYouMean && <p className="dym">هل تقصد: <a href={`/search?q=${encodeURIComponent(didYouMean)}`}>{didYouMean}</a>؟</p>}
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
