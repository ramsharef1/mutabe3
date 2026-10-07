import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchArticle, fetchLive, SITE_URL } from '../../lib/api';
import { excerpt } from '../../components/util';
import { newsArticleLd, liveBlogLd, videoLd, breadcrumbLd, articleImage } from '../../lib/seo';
import JsonLd from '../../components/JsonLd';
import ArticleView from './ArticleView';

// Server-rendered shell: the article itself is fetched here by id or slug (so it
// no longer has to be inside the homepage's latest-20 list) and the page carries
// real title/description/OpenGraph tags for search engines and WhatsApp/X/Facebook
// previews. The interactive body lives in the client ArticleView (D-043 Stage 2).
export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await fetchArticle(params.id);
  if (!a) return { title: 'المقال غير موجود | المتابع', robots: { index: false } };
  const description = a.summary || excerpt(a, 160);
  const url = `/article/${a.id}`;
  const images = [articleImage(a)]; // large photo, or the branded card when the article has none
  return {
    title: `${a.title} | المتابع`,
    description,
    alternates: { canonical: url, types: { 'application/rss+xml': '/feed.xml' } },
    openGraph: {
      type: 'article',
      url,
      title: a.title,
      description,
      images,
      siteName: 'موقع المتابع الاخباري',
      locale: 'ar_JO',
      publishedTime: a.publishedAt,
      modifiedTime: a.updatedAt,
      section: a.category?.name,
      tags: a.seoKeywords,
    },
    twitter: { card: 'summary_large_image', title: a.title, description, images },
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await fetchArticle(params.id);
  if (!article) notFound();
  const live = article.kind === 'LIVE' ? await fetchLive(article.id) : null;
  const video = article.kind === 'VIDEO' ? videoLd(article) : null;
  const crumbs = [
    { name: 'الرئيسية', url: SITE_URL },
    ...(article.category ? [{ name: article.category.name, url: `${SITE_URL}/category/${article.category.slug}` }] : []),
    { name: article.title },
  ];
  return (
    <>
      {/* NewsArticle (LiveBlogPosting for live coverage, + VideoObject for video pieces, D-068) + breadcrumbs (D-043 Stage 5) */}
      <JsonLd data={[live ? liveBlogLd(article, live) : newsArticleLd(article), ...(video ? [video] : []), breadcrumbLd(crumbs)]} />
      <ArticleView article={article} live={live} />
    </>
  );
}
