import { revalidatePath, revalidateTag } from 'next/cache';
import { API_BASE } from '../../lib/api';

// POST /dashboard/revalidate — refresh the cached homepage right after an editor
// saves curation or publishes, instead of waiting up to a minute (D-043 Stage 3).
// `{ "scope": "ads" }` (admins, after saving /dashboard/ads) refreshes the ad
// settings on every page instead (D-043 Stage 5).
// Lives under /dashboard because nginx sends every /api/* request to the Express
// backend. The bearer token is checked against the backend before anything happens.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (!auth) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ads = body?.scope === 'ads';
  try {
    const r = await fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: auth }, cache: 'no-store' });
    if (!r.ok) return Response.json({ error: 'unauthorized' }, { status: 401 });
    const me = await r.json();
    if (!(ads ? ['ADMIN'] : ['ADMIN', 'EDITOR']).includes(me.role)) return Response.json({ error: 'forbidden' }, { status: 403 });
  } catch {
    return Response.json({ error: 'auth check failed' }, { status: 502 });
  }
  if (ads) {
    revalidateTag('ads', { expire: 0 }); // Next 16 needs a profile; expire 0 = purge now, as the one-arg call did in 14 (D-084)
    revalidatePath('/', 'layout');
    return Response.json({ success: true, revalidated: ['ads', 'layout'] });
  }
  revalidatePath('/');
  return Response.json({ success: true, revalidated: ['/'] });
}
