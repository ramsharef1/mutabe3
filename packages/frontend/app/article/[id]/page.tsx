import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchArticle } from '../../lib/api';
import { excerpt } from '../../components/util';
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
  const images = a.featuredImageUrl ? [a.featuredImageUrl] : undefined; // metadataBase (layout) makes these absolute
  return {
    title: `${a.title} | المتابع`,
    description,
    alternates: { canonical: url },
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
    twitter: { card: images ? 'summary_large_image' : 'summary', title: a.title, description, images },
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await fetchArticle(params.id);
  if (!article) notFound();
  return <ArticleView article={article} />;
}
