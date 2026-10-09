'use client';

import { useEffect, useState } from 'react';
import { useBrowserValue, useEventValue } from './hooks';

// Installable app + offline reading (D-043 Stage 5). The service worker lives in
// public/sw.js. Chrome's install prompt can fire before React hydrates, so the
// root layout's inline script parks it on window.__bip and announces it with a
// 'mutabe3:bip' event; the footer button picks it up from there.

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const getPrompt = () => (window as unknown as { __bip?: InstallPrompt | null }).__bip || null;
const clearPrompt = () => { (window as unknown as { __bip?: null }).__bip = null; };

/** Registers the service worker on production builds only (dev HMR and a cached shell don't mix). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}

/** Footer entry «تطبيق المتابع»: installs where the browser allows it, otherwise explains how. */
export function InstallApp() {
  // D-085: both read from the browser; a dismissed prompt and an accepted install are remembered locally
  const promptReady = useEventValue('mutabe3:bip', () => !!getPrompt(), false);
  const standalone = useBrowserValue(() => window.matchMedia('(display-mode: standalone)').matches, false);
  const [used, setReady] = useState<boolean | null>(null); // false once the prompt was shown
  const [accepted, setInstalled] = useState(false);
  const ready = used ?? promptReady;
  const installed = standalone || accepted;
  const [hint, setHint] = useState('');
  if (installed) return null;

  const click = async () => {
    const p = getPrompt();
    if (p) {
      await p.prompt().catch(() => {});
      const choice = await p.userChoice.catch(() => null);
      clearPrompt();
      setReady(false);
      if (choice?.outcome === 'accepted') setInstalled(true);
      return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setHint(ios
      ? 'في Safari اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».'
      : 'من قائمة المتصفح اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».');
  };

  return (
    <button type="button" className="ficon install" onClick={click}>
      <i /><span>{ready ? 'ثبّت تطبيق المتابع' : 'تطبيق المتابع'}</span>
      {hint && <small className="ihint" role="status">{hint}</small>}
    </button>
  );
}
