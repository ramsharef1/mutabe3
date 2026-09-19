'use client';

import { useEffect, useState } from 'react';
import { LIVE, fmtTime } from '../content';
import { ago } from '../util';

// Prominent "live now" banner for the running story — the top-of-page hook that
// links into the full live blog on the article page. Renders nothing when no
// story is live. Follow persists locally (a bookmark primitive; real push comes
// with the backend) so the label stays honest — no notification promise.
export function LiveStrip({ id = 'art-006', title = 'الاجتماع العربي في عمّان' }: { id?: string; title?: string }) {
  const entries = LIVE[id];
  const [, setTick] = useState(0);
  const [following, setFollowing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    try {
      const f = JSON.parse(localStorage.getItem('following') || '[]') as string[];
      setFollowing(f.includes(id));
    } catch {}
    return () => clearInterval(t);
  }, [id]);

  // Client-only: relative timestamps make SSR/hydration diverge, so render after
  // mount. This also means the recency check and Date.now() run only on the client.
  if (!mounted || !entries?.length) return null;
  const latest = entries[0];
  // "Live" must mean recent — hide the banner once the last update ages out
  // (real editorial cadence decides this; 6h is a safe demo window).
  const ageMin = (Date.now() - new Date(latest.at).getTime()) / 60000;
  if (ageMin > 6 * 60) return null;

  const toggle = () => {
    try {
      const f = JSON.parse(localStorage.getItem('following') || '[]') as string[];
      const next = f.includes(id) ? f.filter((x) => x !== id) : [id, ...f];
      localStorage.setItem('following', JSON.stringify(next));
      setFollowing(next.includes(id));
    } catch {}
  };

  return (
    <div className="livestrip">
      <a className="body" href={`/article/${id}`}>
        <span className="badge"><i />مباشر</span>
        <span className="txt">
          <span className="ttl">تطور القصة: {title}</span>
          <span className="upd"><time>{fmtTime(latest.at)}</time>{latest.title || latest.text}</span>
        </span>
        <span className="meta">{entries.length} تحديثات · {ago(latest.at)}</span>
      </a>
      <button type="button" className={`follow ${following ? 'on' : ''}`} onClick={toggle} aria-pressed={following}>
        {following ? '✓ تتابع' : '+ تابِع'}
      </button>
    </div>
  );
}
