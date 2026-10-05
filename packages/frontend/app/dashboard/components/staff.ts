'use client';

// Dashboard session helpers (D-043 Stage 3).
// Access tokens live 15 minutes; refresh tokens 7 days. `adminFetch` adds the
// bearer header and, on a 401, renews the access token once via
// /api/auth/refresh and retries — so an editor who spends 20 minutes on an
// article can still save it instead of being bounced to the login page.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export type Role = 'ADMIN' | 'EDITOR' | 'JOURNALIST' | 'VIEWER';
export interface Me { id: string; name: string; email: string; role: Role }

export const ROLE_AR: Record<string, string> = { ADMIN: 'مدير', EDITOR: 'محرر', JOURNALIST: 'صحفي', VIEWER: 'قارئ' };
export const STAFF: Role[] = ['ADMIN', 'EDITOR', 'JOURNALIST'];
export const EDITORS: Role[] = ['ADMIN', 'EDITOR'];
export const isEditorRole = (r?: string) => r === 'ADMIN' || r === 'EDITOR';

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

let refreshing: Promise<boolean> | null = null;

/** Renew the access token from the stored refresh token. Concurrent callers share one request. */
export function refreshAccess(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const rt = get('refreshToken');
    if (!rt) return false;
    try {
      const r = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: rt }) });
      if (!r.ok) return false;
      const j = await r.json().catch(() => ({}));
      if (!j.accessToken) return false;
      set('accessToken', j.accessToken);
      return true;
    } catch {
      return false;
    }
  })().finally(() => { setTimeout(() => { refreshing = null; }, 0); });
  return refreshing;
}

/** fetch() with the dashboard's bearer token and one transparent refresh on 401. */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const go = () => {
    const headers = new Headers(init.headers || {});
    const t = get('accessToken');
    if (t) headers.set('Authorization', `Bearer ${t}`);
    return fetch(input, { ...init, headers });
  };
  const res = await go();
  if (res.status !== 401) return res;
  return (await refreshAccess()) ? go() : res;
}

export const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

/** Ask the Next server to rebuild the cached homepage now (editors only; failures are harmless). */
export const refreshHomepage = () => adminFetch('/dashboard/revalidate', { method: 'POST' }).then((r) => r.ok).catch(() => false);

export function logout() {
  try { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); } catch {}
  window.location.href = '/auth/login';
}

/**
 * Loads the signed-in staff member. Sends anonymous visitors to the login page;
 * `denied` is true when the role is not in `roles` (the page shows a message).
 */
export function useStaff(roles: Role[] = STAFF) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [denied, setDenied] = useState(false);
  const key = roles.join(',');
  useEffect(() => {
    if (!get('accessToken') && !get('refreshToken')) { router.replace('/auth/login'); return; }
    adminFetch('/api/auth/me')
      .then(async (r) => {
        if (r.status === 401) { router.replace('/auth/login'); return; }
        if (!r.ok) { setDenied(true); return; }
        const u = (await r.json()) as Me;
        setMe(u);
        setDenied(!key.split(',').includes(u.role));
      })
      .catch(() => setDenied(true));
  }, [router, key]);
  return { me, denied };
}
