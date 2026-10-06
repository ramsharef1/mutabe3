'use client';

import { useEffect, useState } from 'react';
import { Amiri } from 'next/font/google';
import { Article, Img, useArticles, SiteHeader, SiteFooter, Sidebar, SecHd, fmtDate, ago, readMins, Crumbs, ShareRow, Chip, Ico, WRITERS, face, AdBanner, isHtml, plain } from '../../components/site';
import { tagsFor, relatedByTag, gallery, LIVE } from '../../components/content';
import { Lightbox, GalleryGrid, useLightbox } from '../../components/gallery';
import { LiveBlog, LiveBadge } from '../../components/live';
import { Comments } from '../../components/comments';

// Article body font, loaded only on this route (B11).
const amiri = Amiri({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-amiri', display: 'swap' });

const FILLER = [
  'وأكد المتحدث الرسمي أن الخطوات التنفيذية ستبدأ خلال الأسابيع المقبلة، مشيراً إلى أن الجهات المعنية أنهت الدراسات الفنية والمالية اللازمة، وأن العمل يجري بالتنسيق مع مختلف الشركاء لضمان تحقيق الأهداف المرسومة ضمن الجدول الزمني المحدد.',
  'وفي السياق ذاته، أشار خبراء إلى أن هذه التطورات تأتي في وقت تشهد فيه المملكة حراكاً واسعاً على أكثر من صعيد، ما يستدعي متابعة دقيقة للنتائج على المدى القريب والمتوسط، ودراسة انعكاساتها على المواطن والاقتصاد الوطني بشكل عام.',
  'ومن المتوقع أن تعلن الجهات المختصة عن مزيد من التفاصيل خلال مؤتمر صحفي يعقد الأسبوع المقبل، يتناول آليات التنفيذ ومصادر التمويل والجدول الزمني للمراحل اللاحقة، إضافة إلى الإجابة عن استفسارات وسائل الإعلام المحلية والعربية.',
];
const QUOTE = 'نعمل على أن تكون النتائج ملموسة للمواطن خلال الأشهر الستة المقبلة، وليس مجرد أرقام في تقرير.';

// Stable writer index for the demo byline (the article may not be in the list any more).
const hashIdx = (s: string, mod: number) => Math.abs(Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % mod;

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
export default function ArticleView({ article: a, preview = false }: { article: Article; preview?: boolean }) {
  const { articles } = useArticles();
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
  }, [a?.id, preview]);

  const catSlug = a.category?.slug || 'politics';
  const catName = a.category?.name || 'أخبار';
  const related = relatedByTag(a, articles.filter((x) => x.id !== a.id));
  const tags = tagsFor(a);
  const live = LIVE[a.id];
  // CMS articles are stored as sanitized HTML and carry their real author; the
  // seeded demo set is plain text and keeps its filler/gallery/writer dressing.
  const html = isHtml(a.content);
  const cmsAuthor = html && a.author?.name ? a.author.name : null;
  const lead = { src: a.featuredImageUrl?.replace('/500/350', '/1200/800') || '', thumb: a.featuredImageUrl || '', cap: a.title };
  const shots = html ? [lead] : [lead, ...gallery(a, 4)];
  const relCards = related.slice(0, 3);
  const relList = related.slice(3, 8);
  const alsoRead = related.slice(0, 2);
  const paras = html ? [] : [a.content, ...FILLER];
  const bodyText = html ? plain(a.content) : paras.join(' ');
  const idx = articles.findIndex((x) => x.id === a.id);
  const prev = idx >= 0 ? articles[idx + 1] : undefined;
  const next = idx > 0 ? articles[idx - 1] : undefined;
  const wi = hashIdx(a.id, WRITERS.length);
  const author = cmsAuthor || WRITERS[wi];
  const views = a.viewsCount ?? 0;
  const Avatar = () => (cmsAuthor ? <span className="au-init" aria-hidden>{cmsAuthor.trim()[0]}</span> : <img src={face(wi)} alt="" />);

  return (
    <div className={`am ${amiri.variable}`}>
      {!preview && <Progress />}
      <SiteHeader articles={articles} />
      <div className="wrap">
        <div className="inner">
          <div className="mainc">
            <Crumbs items={[{ label: catName, href: `/category/${catSlug}` }, { label: a.title }]} />

            <div className="arthead">
              {live ? <LiveBadge /> : <Chip a={a} />}
              <h1>{a.title}</h1>
              {a.summary && <p className="artsum">{a.summary}</p>}
              <div className="artmeta">
                {cmsAuthor
                  ? <span className="au"><Avatar /><span><b>{author}</b><small>المتابع - {catName}</small></span></span>
                  : <a className="au" href="/category/writers"><Avatar /><span><b>{author}</b><small>المتابع - {catName}</small></span></a>}
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
              <figure className="artlead">
                <button type="button" className="im" onClick={() => lb.open(0)} title="عرض الصورة"><Img src={a.featuredImageUrl} priority /><span className="zoom">{Ico.search}</span></button>
                <figcaption>{a.title} <em>— تصوير: المتابع</em></figcaption>
              </figure>
            )}

            {live && <LiveBlog entries={live} />}

            <div className={`artbody fs${size}`}>
              {html ? (
                <>
                  {/* sanitized on write by the backend (sanitize-html allowlist) */}
                  <div className="rich" dangerouslySetInnerHTML={{ __html: a.content }} />
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
                  {i === 0 && <blockquote className="pull">{QUOTE}</blockquote>}
                  {i === 2 && <GalleryGrid shots={shots} onOpen={lb.open} />}
                  {i === 1 && alsoRead.length > 0 && (
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
              <Avatar />
              <div>
                <b>{author}</b>
                {cmsAuthor
                  ? <p>من فريق تحرير موقع المتابع الاخباري — قسم {catName}.</p>
                  : <><p>محرر في قسم {catName} بموقع المتابع الاخباري. يغطي الشأن المحلي والعربي منذ أكثر من عشر سنوات.</p><a href="/category/writers">جميع مقالات الكاتب ›</a></>}
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
