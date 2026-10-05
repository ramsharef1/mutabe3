import type { MetadataRoute } from 'next';
import { fetchArticles, SITE_URL } from './lib/api';
import { NAV } from './components/util';

// Built per request from the published list (D-043 Stage 2).
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await fetchArticles({ take: '100' });
  return [
    { url: SITE_URL, changeFrequency: 'hourly', priority: 1 },
    ...NAV.map((n) => ({ url: `${SITE_URL}/category/${n.slug}`, changeFrequency: 'hourly' as const, priority: 0.8 })),
    ...articles.map((a) => ({
      url: `${SITE_URL}/article/${a.id}`,
      lastModified: a.updatedAt || a.publishedAt,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ];
}
