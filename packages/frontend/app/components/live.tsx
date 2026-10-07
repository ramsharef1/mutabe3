'use client';

import { useEffect, useState } from 'react';
import { LiveEntry, fmtTime } from './content';
import { ago, Ico } from './site';

export const LiveBadge = ({ small = false }: { small?: boolean }) => (
  <span className={`live ${small ? 'sm' : ''}`}><i />مباشر</span>
);

const anchor = (e: LiveEntry) => `u-${e.id || e.at}`;

/** Timestamped updates, newest first, with a "key moments" jump list. `open` false = coverage ended (D-068). */
export function LiveBlog({ entries, open = true }: { entries: LiveEntry[]; open?: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const keys = entries.filter((e) => e.key || e.title);
  const last = entries[0];
  return (
    <section className={`lblog ${open ? '' : 'ended'}`} data-tick={tick}>
      <div className="lblog-hd">
        {open ? <LiveBadge /> : <span className="ended-tag">انتهت التغطية</span>}
        {last && <span className="upd">{Ico.clock}آخر تحديث {ago(last.at)}</span>}
        {open && <span className="auto"><i />يتم التحديث تلقائياً</span>}
      </div>
      {keys.length > 0 && (
        <div className="lblog-keys">
          <b>أبرز اللحظات</b>
          <ul>{keys.map((e) => <li key={anchor(e)}><a href={`#${anchor(e)}`}><time>{fmtTime(e.at)}</time>{e.title || e.text.slice(0, 60)}</a></li>)}</ul>
        </div>
      )}
      {entries.length === 0
        ? <p className="lblog-empty">بدأت التغطية — ستظهر التحديثات هنا تباعاً.</p>
        : (
          <ol className="lblog-list">
            {entries.map((e, i) => (
              <li key={anchor(e)} id={anchor(e)} className={`${i === 0 && open ? 'new' : ''} ${e.key ? 'key' : ''}`}>
                <div className="when"><time>{fmtTime(e.at)}</time><small>{ago(e.at)}</small></div>
                <div className="what">
                  {e.key && <span className="kt">لحظة مهمة</span>}
                  {e.title && <h3>{e.title}</h3>}
                  <p>{e.text}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      {entries.length > 0 && <div className="lblog-ft">بدأت التغطية {fmtTime(entries[entries.length - 1].at)} · {entries.length} تحديثات</div>}
    </section>
  );
}

/**
 * A real live blog (D-068): starts from the server-rendered entries and, while the coverage is open
 * and the tab is visible, re-reads /api/articles/:id/live every 30 seconds. Stops once it has ended.
 */
export function LiveFeed({ articleId, initial }: { articleId: string; initial: { open: boolean; entries: LiveEntry[] } }) {
  const [data, setData] = useState(initial);
  useEffect(() => {
    if (!data.open) return;
    let stop = false;
    const pull = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const r = await fetch(`/api/articles/${encodeURIComponent(articleId)}/live`, { cache: 'no-store' });
        if (!r.ok || stop) return;
        const j = await r.json();
        if (j?.data) setData({ open: j.data.open, entries: j.data.entries });
      } catch { /* offline: keep what is shown */ }
    };
    const t = setInterval(pull, 30000);
    document.addEventListener('visibilitychange', pull);
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', pull); };
  }, [articleId, data.open]);
  return <LiveBlog entries={data.entries} open={data.open} />;
}
