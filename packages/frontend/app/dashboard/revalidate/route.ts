import { revalidatePath } from 'next/cache';
import { API_BASE } from '../../lib/api';

// POST /dashboard/revalidate — refresh the cached homepage right after an editor
// saves curation or publishes, instead of waiting up to a minute (D-043 Stage 3).
// Lives under /dashboard because nginx sends every /api/* request to the Express
// backend. The bearer token is checked against the backend before anything happens.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (!auth) return Response.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const r = await fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: auth }, cache: 'no-store' });
    if (!r.ok) return Response.json({ error: 'unauthorized' }, { status: 401 });
    const me = await r.json();
    if (!['ADMIN', 'EDITOR'].includes(me.role)) return Response.json({ error: 'forbidden' }, { status: 403 });
  } catch {
    return Response.json({ error: 'auth check failed' }, { status: 502 });
  }
  revalidatePath('/');
  return Response.json({ success: true, revalidated: ['/'] });
}
