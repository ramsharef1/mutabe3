import { fetchArticles, SITE_URL, absUrl } from '../lib/api';
import { plain } from '../components/util';

// RSS 2.0 of the latest published articles (D-043 Stage 2).
export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
const mime = (u: string) => (/\.png$/i.test(u) ? 'image/png' : /\.webp$/i.test(u) ? 'image/webp' : /\.gif$/i.test(u) ? 'image/gif' : 'image/jpeg');

export async function GET() {
  const items = await fetchArticles({ take: '30' });
  const now = new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>موقع المتابع الاخباري</title>
<link>${SITE_URL}</link>
<description>آخر أخبار الأردن والعالم</description>
<language>ar</language>
<lastBuildDate>${now}</lastBuildDate>
<atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items.map((a) => {
  const link = `${SITE_URL}/article/${a.id}`;
  const img = absUrl(a.featuredImageUrl);
  const desc = a.summary || plain(a.content).slice(0, 300);
  return `<item>
<title>${esc(a.title)}</title>
<link>${link}</link>
<guid isPermaLink="true">${link}</guid>
<pubDate>${new Date(a.publishedAt || now).toUTCString()}</pubDate>
${a.category ? `<category>${esc(a.category.name)}</category>` : ''}
<description>${esc(desc)}</description>
${img ? `<enclosure url="${esc(img)}" length="0" type="${mime(img)}"/>` : ''}
</item>`;
}).join('\n')}
</channel>
</rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
