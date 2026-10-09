'use client';

import { useEffect, useState } from 'react';
import { Article, Img, useArticles, SiteHeader, SiteFooter, Sidebar, SecHd, fmtDate, ago, readMins, Crumbs, ShareRow, Chip, Ico, AdBanner, isHtml, plain } from '../../components/site';
import { tagsFor, relatedByTag, liveNow } from '../../components/content';
import { decorateRichImages } from '../../components/img';
import { track } from '../../lib/track';
import { Lightbox, useLightbox } from '../../components/gallery';
import { LiveBadge, LiveFeed } from '../../components/live';
import type { LiveData } from '../../lib/api';
import { Comments } from '../../components/comments';
import { AuthorFace, authorHref } from '../../components/authors';


function Progress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const f = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0);
    };
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return <div className="progress" style={{ width: `${p}%` }} />;
}

/**
 * The article page body. `article` is fetched by the server route (or by the
 * dashboard preview); the published list is still loaded client-side for the
 * header, sidebar, related items and prev/next, and never blocks the article.
 */
export default function ArticleView({ article: a, preview = false, live: liveData = null, articles: initialArticles }: { article: Article; preview?: boolean; live?: LiveData | null; articles?: Article[] }) {
  const { articles } = useArticles(initialArticles); // server-fetched by the page (D-070)
  const [size, setSize] = useState(0); // -1 / 0 / 1 / 2 → font-size steps
  const lb = useLightbox();

  // Record this read: locally (powers homepage "مختارة لك") and on the server
  // (viewsCount → most-read / trending). One server hit per article per tab session.
  // Previews of unpublished drafts are never counted.
  useEffect(() => {
    if (preview || !a?.id) return;
    try {
      const prev = JSON.parse(localStorage.getItem('seen') || '[]') as string[];
      localStorage.setItem('seen', JSON.stringify([a.id, ...prev.filter((x) => x !== a.id)].slice(0, 20)));
    } catch {}
    try {
      const k = `viewed:${a.id}`;
      if (!sessionStorage.getItem(k)) {
        sessionStorage.setItem(k, '1');
        fetch(`/api/articles/${a.id}/view`, { method: 'POST', keepalive: true }).catch(() => {});
      }
    } catch {}
    // GA4 side of the same read (ANALYTICS-PLAN §2); the server count above stays the "views" figure.
    track('article_view', { article_id: a.id, content_category: a.category?.slug || '', content_author: a.author?.name || '', is_sponsored: false });
  }, [a?.id, a?.category?.slug, a?.author?.name, preview]);

  const catSlug = a.category?.slug || 'politics';
  const catName = a.category?.name || 'أخبار';
  const related = relatedByTag(a, articles.filter((x) => x.id !== a.id));
  const tags = tagsFor(a);
  const realLive = a.kind === 'LIVE' && liveData;
  const caricature = a.kind === 'CARICATURE';
  // CMS articles are stored as sanitized HTML; plain text is shown as its own paragraphs and nothing else —
  // no added paragraphs, quote, photo gallery or invented byline (D-089).
  const html = isHtml(a.content);
  const author = (!a.isSample && a.author?.name) || 'فريق المتابع'; // samples carry no personal byline (D-080)
  const lead = { src: a.featuredImageUrl?.replace('/500/350', '/1200/800') || '', thumb: a.featuredImageUrl || '', cap: a.title };
  const shots = [lead];
  const relCards = related.slice(0, 3);
  const relList = related.slice(3, 8);
  const alsoRead = related.slice(0, 2);
  const paras = html ? [] : (a.content || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const bodyText = html ? plain(a.content) : paras.join(' ');
  const idx = articles.findIndex((x) => x.id === a.id);
  const prev = idx >= 0 ? articles[idx + 1] : undefined;
  const next = idx > 0 ? articles[idx - 1] : undefined;
  const views = a.viewsCount ?? 0;
  const avatar = <AuthorFace name={author} photoUrl={a.isSample ? undefined : a.author?.photoUrl} />; // an element, not a component made per render (D-085)
  const authorSlug = !a.isSample && a.author?.jobTitle ? a.author?.slug : null; // page exists only for opted-in profiles (D-067)
  const authorLine = (!a.isSample && a.author?.jobTitle) || `المتابع - ${catName}`;

  return (
    <div className="am">
      {!preview && <Progress />}
      <SiteHeader />
      <div className="wrap">
        <div className="inner">
          <div className="mainc">
            <Crumbs items={[{ label: catName, href: `/category/${catSlug}` }, { label: a.title }]} />

            <div className="arthead">
              {liveNow(a) ? <LiveBadge /> : <Chip a={a} />}
              {/* Paid material: the disclosure the Press & Publications Law asks for, above the headline (D-056) */}
              {a.isSample && <div className="sample-note">مادة تجريبية توضّح شكل هذا القسم وليست خبراً — تُستبدل بالأخبار الحقيقية فور نشرها.</div>}
              {a.kind === 'SPONSORED' && <div className="sponsored-note">محتوى مدفوع{a.sponsorName ? ` من ${a.sponsorName}` : ''} — لا يعبّر عن رأي التحرير · <a href="/editorial-policy#sponsored">كيف نتعامل مع الإعلان</a></div>}
              <h1>{a.title}</h1>
              {a.summary && <p className="artsum">{a.summary}</p>}
              <div className="artmeta">
                {/* real authors link to their page (D-067) */}
                {authorSlug
                  ? <a className="au" href={authorHref(authorSlug)} rel="author">{avatar}<span><b>{author}</b><small>{authorLine}</small></span></a>
                  : <span className="au">{avatar}<span><b>{author}</b><small>{authorLine}</small></span></span>}
                <span title={fmtDate(a.publishedAt)}>{Ico.clock}{a.publishedAt ? ago(a.publishedAt) : 'غير منشور'}</span>
                <span>{Ico.eye}{views} مشاهدة</span>
                <span className="rt">{readMins(bodyText)} دقائق قراءة</span>
                <span className="fs">
                  <button type="button" onClick={() => setSize((s) => Math.max(-1, s - 1))} title="تصغير الخط">أ-</button>
                  <button type="button" onClick={() => setSize((s) => Math.min(2, s + 1))} title="تكبير الخط">أ+</button>
                </span>
              </div>
              <ShareRow title={a.title} />
            </div>

            {a.featuredImageUrl && (
              <figure className={`artlead${caricature ? ' caric' : ''}`}>
                <button type="button" className="im" onClick={() => lb.open(0)} title="عرض الصورة"><Img src={a.featuredImageUrl} priority /><span className="zoom">{Ico.search}</span></button>
                {/* no invented credit: the credit line appears only when the desk filled it in (D-054, F-03) */}
                <figcaption>{a.coverCaption || a.title}{a.coverCredit && <em> — الصورة: {a.coverCredit}</em>}</figcaption>
              </figure>
            )}

            {realLive && <LiveFeed articleId={a.id} initial={{ open: liveData.open, entries: liveData.entries }} />}

            <div className={`artbody fs${size}`}>
              {html ? (
                <>
                  {/* sanitized on write by the backend (sanitize-html allowlist); uploaded images get a WebP srcset (D-045) */}
                  <div className="rich" dangerouslySetInnerHTML={{ __html: decorateRichImages(a.content) }} />
                  {alsoRead.length > 0 && (
                    <aside className="also">
                      <b>اقرأ أيضاً</b>
                      <ul>{alsoRead.map((r) => <li key={r.id}><a href={`/article/${r.id}`}>{r.title}</a></li>)}</ul>
                    </aside>
                  )}
                </>
              ) : paras.map((p, i) => (
                <div key={i}>
                  <p>{p}</p>
                  {i === Math.min(1, paras.length - 1) && alsoRead.length > 0 && (
                    <aside className="also">
                      <b>اقرأ أيضاً</b>
                      <ul>{alsoRead.map((r) => <li key={r.id}><a href={`/article/${r.id}`}>{r.title}</a></li>)}</ul>
                    </aside>
                  )}
                </div>
              ))}
            </div>

            {tags.length > 0 && (
              <div className="tags">
                <span>كلمات مفتاحية:</span>
                {tags.map((t) => <a key={t} href={`/tag/${encodeURIComponent(t)}`}>{t}</a>)}
              </div>
            )}

            <div className="artsrc">
              <span>المصدر: المتابع - {catName}</span>
              <ShareRow title={a.title} compact />
            </div>

            <div className="aubox">
              {avatar}
              <div>
                <b>{author}</b>
                <p>{authorSlug && authorLine !== `المتابع - ${catName}` ? `${authorLine} — موقع المتابع الاخباري.` : `من فريق تحرير موقع المتابع الاخباري — قسم ${catName}.`}</p>
                {authorSlug && <a href={authorHref(authorSlug)}>جميع مقالات الكاتب ›</a>}
              </div>
            </div>

            {(prev || next) && (
              <div className="prevnext">
                {prev ? <a className="pv" href={`/article/${prev.id}`}><small>{Ico.chev} الخبر السابق</small><span>{prev.title}</span></a> : <span />}
                {next ? <a className="nx" href={`/article/${next.id}`}><small>الخبر التالي {Ico.chev}</small><span>{next.title}</span></a> : <span />}
              </div>
            )}

            <AdBanner variant={3} className="adrow ad90" zone="article" />

            {related.length > 0 && (
              <div className="sec">
                <SecHd t="أخبار ذات صلة" slug={catSlug} />
                <p className="relnote">مقترحة بحسب الكلمات المفتاحية المشتركة</p>
                <div className="cards cards3">
                  {relCards.map((r) => (
                    <a key={r.id} className="card" href={`/article/${r.id}`}>
                      <div className="im"><Img src={r.featuredImageUrl} /><Chip a={r} /></div>
                      <div className="t">{r.title}</div>
                      <span className="tm">{ago(r.publishedAt)}</span>
                    </a>
                  ))}
                </div>
                <ul className="arr" style={{ marginTop: 8 }}>{relList.map((r) => <li key={r.id}><a href={`/article/${r.id}`}>{r.title}</a></li>)}</ul>
              </div>
            )}

            <Comments articleId={a.id} enabled={!preview && a.status !== 'DRAFT'} />
          </div>

          <Sidebar articles={articles} />
        </div>
      </div>
      <SiteFooter />
      {lb.idx !== null && <Lightbox shots={shots} index={lb.idx} onClose={lb.close} onIndex={lb.set} />}
    </div>
  );
}
