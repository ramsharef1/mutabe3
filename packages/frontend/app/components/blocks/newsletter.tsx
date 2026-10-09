'use client';

import { useMemo, useState } from 'react';
import { subscribe, CONFIRM_MSG } from '../newsletter';
import { track } from '../../lib/track';
import { useBrowserValue } from '../hooks';

const EDITIONS = ['سياسة', 'اقتصاد', 'فلسطين']; // no «رياضة»: the sports section is hidden (D-089)

// Homepage newsletter box: the picked editions are stored with the subscription
// (D-043 Stage 4); an empty pick means "everything".
export function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [hp, setHp] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');
  // saved editions come from the browser (D-085); once the reader toggles one, local state takes over
  const storedRaw = useBrowserValue(() => localStorage.getItem('editions'), null);
  const stored = useMemo<string[]>(() => { try { return JSON.parse(storedRaw || '[]'); } catch { return []; } }, [storedRaw]);
  const [picked, setPicks] = useState<string[] | null>(null);
  const picks = picked ?? stored;

  const toggle = (t: string) => {
    setPicks((prevSet) => {
      const prev = prevSet ?? stored;
      const next = prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t];
      try {
        localStorage.setItem('editions', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setState('busy');
    const r = await subscribe(email, { categories: picks, source: 'homepage', website: hp });
    if (r.ok) { setState('done'); setEmail(''); track('newsletter_signup', { source: 'homepage', editions_count: picks.length }); } else { setState('idle'); setErr(r.error || ''); }
  }

  return (
    <div className="news-cta">
      <div className="content">
        <h3>اشترك في نشرة المتابع</h3>
        <p>اختر نشراتك — يصلك ملخّصها على بريدك</p>
      </div>

      <div className="editions" role="group" aria-label="نشرات حسب القسم">
        {EDITIONS.map((t) => (
          <button type="button" key={t} className={`ed ${picks.includes(t) ? 'on' : ''}`} onClick={() => toggle(t)} aria-pressed={picks.includes(t)}>
            {t}
          </button>
        ))}
      </div>

      {state === 'done' ? (
        <p className="nl-ok" role="status">✓ {CONFIRM_MSG} يمكنك إلغاء الاشتراك في أي وقت من رابط أسفل كل رسالة.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="بريدك الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={state === 'busy'}
            aria-label="البريد الإلكتروني"
          />
          <input className="hp" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} aria-hidden="true" name="website" />
          <button type="submit" disabled={state === 'busy'}>
            {state === 'busy' ? '…' : 'اشترك'}
          </button>
        </form>
      )}
      {err && <p className="nl-err" role="alert">{err}</p>}
    </div>
  );
}
