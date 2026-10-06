import { fetchArticles, SITE_URL } from '../lib/api';
import { SITE_NAME, xmlEsc } from '../lib/seo';

// Google News sitemap (D-043 Stage 5): only stories published in the last 48
// hours, as Google asks; older ones stay in /sitemap.xml. An empty urlset is valid.
export const dynamic = 'force-dynamic';

const WINDOW_MS = 48 * 60 * 60 * 1000;

export async function GET() {
  const since = Date.now() - WINDOW_MS;
  const items = (await fetchArticles({ take: '100' })).filter((a) => a.publishedAt && new Date(a.publishedAt).getTime() >= since);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items.map((a) => `<url>
<loc>${SITE_URL}/article/${a.id}</loc>
<news:news>
<news:publication><news:name>${xmlEsc(SITE_NAME)}</news:name><news:language>ar</news:language></news:publication>
<news:publication_date>${new Date(a.publishedAt as string).toISOString()}</news:publication_date>
<news:title>${xmlEsc(a.title)}</news:title>
</news:news>
</url>`).join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
