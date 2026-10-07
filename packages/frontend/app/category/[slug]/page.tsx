import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchCategories, fetchArticles, SITE_URL } from '../../lib/api';
import { CAT_LABELS, CAT_DESC } from '../../components/util';
import { collectionLd, breadcrumbLd, SITE_NAME } from '../../lib/seo';
import JsonLd from '../../components/JsonLd';
import CategoryView from './CategoryView';

// Server shell for a section page (F-05b): the <title>, description, canonical and the
// CollectionPage + breadcrumb JSON-LD come from the DB category — name and description
// as managed in /dashboard/categories — with the built-in labels as fallback. The list,
// filters and pager stay in the client CategoryView.
export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };
const SLUG = /^[a-z0-9-]{1,40}$/;

async function resolve(slug: string) {
  if (!SLUG.test(slug)) return null;
  const cats = await fetchCategories();
  const c = cats.find((x) => x.slug === slug);
  if (c) return { name: c.name, description: c.description || CAT_DESC[slug] || `آخر أخبار ${c.name} على ${SITE_NAME}`, indexable: true };
  // In the site's own label table but not in the DB: render the (empty) section, but keep it out of the
  // index — unless the API is down, in which case we must not tell Googlebot "noindex" by accident.
  if (CAT_LABELS[slug]) return { name: CAT_LABELS[slug], description: CAT_DESC[slug] || `آخر أخبار ${CAT_LABELS[slug]} على ${SITE_NAME}`, indexable: cats.length === 0 };
  return null; // unknown slug = 404 (CONTENT-ARCHITECTURE)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await resolve(params.slug);
  if (!c) return { title: 'القسم غير موجود | المتابع', robots: { index: false } };
  const url = `/category/${params.slug}`;
  return {
    title: `${c.name} | المتابع`,
    description: c.description,
    alternates: { canonical: url, types: { 'application/rss+xml': '/feed.xml' } },
    ...(c.indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: { type: 'website', url, title: c.name, description: c.description, siteName: SITE_NAME, locale: 'ar_JO' },
    twitter: { card: 'summary_large_image', title: c.name, description: c.description },
  };
}

export default async function CategoryPage({ params }: Props) {
  const c = await resolve(params.slug);
  if (!c) notFound();
  const url = `/category/${params.slug}`;
  // Both lists on the server (D-070): the section used to render «جاري تحميل الأخبار» until two browser fetches returned.
  const [latest, own] = await Promise.all([fetchArticles({}, 60), fetchArticles({ category: params.slug, take: '60' }, 60)]);
  return (
    <>
      <JsonLd data={[collectionLd({ name: c.name, description: c.description, url }), breadcrumbLd([{ name: 'الرئيسية', url: SITE_URL }, { name: c.name }])]} />
      <CategoryView initialArticles={latest.length ? latest : undefined} initialList={latest.length ? own : undefined} />
    </>
  );
}
