'use client';

// Newsletter signup used by every form on the site (D-043 Stage 4).
export async function subscribe(email: string, opts: { categories?: string[]; source: string; website?: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, categories: opts.categories || [], source: opts.source, website: opts.website || '' }),
    });
    if (r.ok) return { ok: true };
    const j = await r.json().catch(() => ({}));
    return { ok: false, error: j.error || 'تعذّر الاشتراك. حاول مجدداً.' };
  } catch {
    return { ok: false, error: 'تعذّر الاتصال. حاول مجدداً.' };
  }
}
