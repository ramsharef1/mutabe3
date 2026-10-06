import { fetchAds } from '../lib/ads';

// /ads.txt — the list of sellers allowed to sell this site's ad space (IAB).
// Built from /dashboard/ads: the AdSense line when a publisher id is set, plus
// any lines an admin adds for other networks. 404 while nothing is configured,
// which leaves buyers unrestricted (an empty file would be read as "no one").
export const dynamic = 'force-dynamic';

export async function GET() {
  const ads = await fetchAds();
  const lines: string[] = [];
  if (ads.adsense.client) lines.push(`google.com, ${ads.adsense.client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0`);
  if (ads.adsTxt) lines.push(...ads.adsTxt.split('\n'));
  if (!lines.length) return new Response('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(`${lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
