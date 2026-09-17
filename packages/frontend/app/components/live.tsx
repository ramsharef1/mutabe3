'use client';

import { useEffect, useState } from 'react';
import { LiveEntry, fmtTime } from './content';
import { ago, Ico } from './site';

export const LiveBadge = ({ small = false }: { small?: boolean }) => (
  <span className={`live ${small ? 'sm' : ''}`}><i />مباشر</span>
);

/** Timestamped updates, newest first, with a "key moments" jump list. */
export function LiveBlog({ entries }: { entries: LiveEntry[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const keys = entries.filter((e) => e.key || e.title);
  const last = entries[0];
  return (
    <section className="lblog" data-tick={tick}>
      <div className="lblog-hd">
        <LiveBadge />
        <span className="upd">{Ico.clock}آخر تحديث {ago(last.at)}</span>
        <span className="auto"><i />يتم التحديث تلقائياً</span>
      </div>
      {keys.length > 0 && (
        <div className="lblog-keys">
          <b>أبرز اللحظات</b>
          <ul>{keys.map((e) => <li key={e.at}><a href={`#u-${e.at}`}><time>{fmtTime(e.at)}</time>{e.title || e.text.slice(0, 60)}</a></li>)}</ul>
        </div>
      )}
      <ol className="lblog-list">
        {entries.map((e, i) => (
          <li key={e.at} id={`u-${e.at}`} className={`${i === 0 ? 'new' : ''} ${e.key ? 'key' : ''}`}>
            <div className="when"><time>{fmtTime(e.at)}</time><small>{ago(e.at)}</small></div>
            <div className="what">
              {e.key && <span className="kt">لحظة مهمة</span>}
              {e.title && <h3>{e.title}</h3>}
              <p>{e.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="lblog-ft">بدأت التغطية {fmtTime(entries[entries.length - 1].at)} · {entries.length} تحديثات</div>
    </section>
  );
}
