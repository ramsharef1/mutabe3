'use client';

// Newsletter signup used by every form on the site (D-043 Stage 4).
// Double opt-in (D-054): `pending` = a confirmation mail was sent; `active` = this address was already confirmed.
export const CONFIRM_MSG = 'أرسلنا رسالة تأكيد إلى بريدك — افتحها واضغط «تأكيد الاشتراك» لتصلك النشرة.';
export async function subscribe(email: string, opts: { categories?: string[]; source: string; website?: string }): Promise<{ ok: boolean; status?: 'pending' | 'active'; error?: string }> {
  try {
    const r = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, categories: opts.categories || [], source: opts.source, website: opts.website || '' }),
    });
    if (r.ok) { const j = await r.json().catch(() => ({})); return { ok: true, status: j.status === 'active' ? 'active' : 'pending' }; }
    const j = await r.json().catch(() => ({}));
    return { ok: false, error: j.error || 'تعذّر الاشتراك. حاول مجدداً.' };
  } catch {
    return { ok: false, error: 'تعذّر الاتصال. حاول مجدداً.' };
  }
}
