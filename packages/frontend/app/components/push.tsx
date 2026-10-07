'use client';

// «تنبيهات عاجل» (D-072): the reader opts in to browser alerts for breaking news. Renders nothing until an
// admin switches push on, or when the browser can't receive push (e.g. iPhone Safari outside an installed
// app). The permission prompt only appears after the reader taps — never on page load (BIBLE: no pop-ups).
import { useEffect, useState } from 'react';

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

type State = 'hidden' | 'off' | 'on' | 'denied' | 'busy';
const Bell = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
    <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1Z" />
    {!on && <path d="M3.5 3.5l17 17" stroke="currentColor" strokeWidth="2" />}
  </svg>
);

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [key, setKey] = useState<string | null>(null);
  const [state, setState] = useState<State>('hidden');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!supported()) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/push/key', { cache: 'no-store' });
        const d = (await r.json())?.data;
        if (!alive || !d?.enabled || !d.publicKey) return;
        setKey(d.publicKey);
        if (Notification.permission === 'denied') { setState('denied'); return; }
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        setState(sub ? 'on' : 'off');
      } catch { /* offline or old API: stay hidden */ }
    })();
    return () => { alive = false; };
  }, []);

  if (state === 'hidden' || !key) return null;

  const turnOn = async () => {
    setState('busy'); setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
      const r = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      if (!r.ok) { await sub.unsubscribe().catch(() => {}); throw new Error(); }
      setState('on'); setMsg('ستصلك تنبيهات الأخبار العاجلة.');
    } catch { setState('off'); setMsg('تعذّر التفعيل — حاول مرة أخرى.'); }
  };
  const turnOff = async () => {
    setState('busy'); setMsg('');
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setState('off'); setMsg('أُوقفت التنبيهات.');
    } catch { setState('on'); }
  };

  if (state === 'denied') {
    return compact ? null : <span className="push-tg denied">التنبيهات محظورة في إعدادات المتصفح لهذا الموقع</span>;
  }
  const on = state === 'on';
  return (
    <span className={`push-tg ${compact ? 'compact' : ''}`}>
      <button type="button" aria-pressed={on} disabled={state === 'busy'} onClick={on ? turnOff : turnOn}>
        <Bell on={on} />{on ? 'تنبيهات عاجل مفعّلة' : 'فعّل تنبيهات عاجل'}
      </button>
      {msg && <small role="status">{msg}</small>}
    </span>
  );
}
