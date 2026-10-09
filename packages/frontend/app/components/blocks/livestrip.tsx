'use client';

import { useState } from 'react';
import { LIVE, fmtTime, type LiveEntry } from '../content';
import type { CurrentLive } from '../../lib/api';
import { ago } from '../util';
import { useNow, useBrowserValue } from '../hooks';

// Prominent "live now" banner for the running story — the top-of-page hook that
// links into the full live blog on the article page. Renders nothing when no
// story is live. Follow persists locally (a bookmark primitive; real push comes
// with the backend) so the label stays honest — no notification promise.
// Real coverage (D-068) passes `current` from GET /api/live/current; without it the seeded demo story is used.
export function LiveStrip({ current }: { current?: CurrentLive | null }) {
  const id = current?.id || 'art-006';
  const title = current?.title || 'الاجتماع العربي في عمّان';
  const href = current ? `/article/${encodeURIComponent(current.slug || current.id)}` : `/article/${id}`;
  const entries: LiveEntry[] | undefined = current ? [{ ...current.latest }] : LIVE[id];
  const count = current ? current.count : entries?.length || 0;
  // D-085: the shared clock (null until hydrated) drives «منذ …» and the 6 h cut-off; the follow flag is read
  // from the browser, and a click overrides it for this page.
  const now = useNow();
  const mounted = now !== null;
  const storedFollow = useBrowserValue(() => (JSON.parse(localStorage.getItem('following') || '[]') as string[]).includes(id), false);
  const [followSet, setFollowing] = useState<boolean | null>(null);
  const following = followSet ?? storedFollow;

  // Rendered on the server (D-070): inserting it after mount pushed the page down by ~160 px (CLS 0.11).
  // Only the relative "منذ …" text waits for mount — it is inline, so filling it in moves nothing.
  if (!entries?.length) return null;
  const latest = entries[0];
  // "Live" must mean recent — real coverage is already limited to 12 h by /api/live/current; the demo
  // story is generated relative to load time. The check stays client-side for a page left open for hours.
  const ageMin = now !== null ? (now - new Date(latest.at).getTime()) / 60000 : 0;
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
      <a className="body" href={href}>
        <span className="badge"><i />مباشر</span>
        <span className="txt">
          <span className="ttl">{current ? title : `تطور القصة: ${title}`}</span>
          <span className="upd"><time suppressHydrationWarning>{fmtTime(latest.at)}</time>{latest.title || latest.text}</span>
        </span>
        <span className="meta">{count} تحديثات{mounted ? ` · ${ago(latest.at)}` : ''}</span>
      </a>
      <button type="button" className={`follow ${following ? 'on' : ''}`} onClick={toggle} aria-pressed={following}>
        {following ? '✓ تتابع' : '+ تابِع'}
      </button>
    </div>
  );
}
