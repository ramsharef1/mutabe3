'use client';

import { useEffect, useState } from 'react';
import type { Prayer, Wx } from '../feeds';
import { MET_ALERT, wxIcon } from '../feeds';

/** Minutes until a decimal-hour time today (Amman), wrapping to tomorrow. */
function untilLabel(h: number) {
  const now = new Date();
  const amman = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Amman' }));
  const cur = amman.getHours() + amman.getMinutes() / 60;
  let diff = h - cur;
  if (diff < 0) diff += 24;
  const H = Math.floor(diff), M = Math.round((diff - H) * 60);
  return `بعد ${H}:${String(M).padStart(2, '0')}`;
}

export function UtilityStrip({ prayers, wx, hijriText, dateText }: { prayers: Prayer[]; wx: Wx[]; hijriText: string; dateText: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const amman = now ? new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Amman' })) : null;
  const cur = amman ? amman.getHours() + amman.getMinutes() / 60 : 0;
  const nextIdx = prayers.findIndex((p) => p.k !== 'sunrise' && p.h > cur);
  const next = nextIdx === -1 ? 0 : nextIdx;
  const time = amman ? `${String(amman.getHours()).padStart(2, '0')}:${String(amman.getMinutes()).padStart(2, '0')}` : '';
  return (
    <div className="util" aria-label="التاريخ ومواقيت الصلاة والطقس">
      <div className="d"><b>{dateText}</b><small>{hijriText}{time && ` · عمّان ${time}`}</small></div>
      <ul className="pr">
        {prayers.map((p, i) => (
          <li key={p.k} className={i === next && now ? 'next' : ''}><b>{p.t}</b>{p.n}{i === next && now && <small>{untilLabel(p.h)}</small>}</li>
        ))}
      </ul>
      <div className="wx">
        {wx.slice(0, 4).map((w) => <span key={w.n} title={w.n}>{w.n} <b>{w.t}°</b><i aria-hidden>{wxIcon(w.code)}</i></span>)}
        <a href="#weather" className="more-wx">+{wx.length - 4}</a>
      </div>
    </div>
  );
}

/** Met-office warning + school-closure chips. Renders nothing when no alert is active. */
export function MetAlert() {
  const a = MET_ALERT;
  const [open, setOpen] = useState(true);
  if (!a || !open) return null;
  return (
    <div className="alert" role="status">
      <span className="ic" aria-hidden>!</span>
      <div className="txt"><b>{a.title}</b><p>{a.text}</p></div>
      <div className="sch">
        <small>تعطيل الدوام غداً — حسب المحافظة</small>
        <div className="chips">{a.closures.map((c) => <span key={c.n} className={c.off ? 'off' : 'on'}>{c.n}</span>)}<span>+6</span></div>
      </div>
      <button type="button" className="x" onClick={() => setOpen(false)} aria-label="إغلاق التنبيه">×</button>
    </div>
  );
}
