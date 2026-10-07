'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { track } from '../lib/track';

// GTM + consent bar (D-055 / ANALYTICS-PLAN §3–4). Everything here is inert until NEXT_PUBLIC_GTM_ID is
// set at build time, so the site ships no third-party script and no banner until the account exists.
// Consent Mode v2, "Advanced": the container loads with every storage type denied; the bar grants
// analytics_storage only. Staff paths never load it. The choice lives in localStorage (consent.v1)
// and is asked again after 12 months; the footer's «إعدادات الخصوصية» link re-opens the bar.
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';
const KEY = 'consent.v1';
const TTL = 365 * 24 * 60 * 60 * 1000;
const STAFF = /^\/(dashboard|auth|offline)(\/|$)/;

interface Stored { analytics: boolean; at: number }
const read = (): Stored | null => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && typeof v.analytics === 'boolean' && Date.now() - v.at < TTL ? v : null; } catch { return null; } };
const write = (analytics: boolean) => { try { localStorage.setItem(KEY, JSON.stringify({ analytics, at: Date.now() })); } catch {} };

function applyConsent(analytics: boolean) {
  const g = window.gtag || ((...args: unknown[]) => { (window.dataLayer ||= []).push(args as unknown as Record<string, unknown>); });
  g('consent', 'update', { analytics_storage: analytics ? 'granted' : 'denied' });
  track('consent_update', { analytics_storage: analytics ? 'granted' : 'denied' });
}

export function Analytics() {
  const path = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const staff = STAFF.test(path);

  useEffect(() => {
    if (!GTM_ID || staff) return;
    const s = read();
    if (s) applyConsent(s.analytics); else setOpen(true);
    const reopen = () => setOpen(true);
    addEventListener('mutabe3:consent', reopen);
    return () => removeEventListener('mutabe3:consent', reopen);
  }, [staff]);

  if (!GTM_ID || staff) return null;
  const choose = (analytics: boolean) => { write(analytics); applyConsent(analytics); setOpen(false); };

  return (
    <>
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      {open && (
        <div className="consent" role="dialog" aria-live="polite" aria-label="إعدادات الخصوصية">
          <p>نستخدم قياساً مجهّلاً لمعرفة ما يُقرأ وإثبات حجم الجمهور للمعلنين. لا يعمل إلا بموافقتك، ويمكنك تغيير رأيك في أي وقت من «إعدادات الخصوصية» أسفل الصفحة. <a href="/privacy#cookies">التفاصيل</a></p>
          <div className="btns">
            <button type="button" className="ok" onClick={() => choose(true)}>موافق</button>
            <button type="button" className="no" onClick={() => choose(false)}>رفض</button>
          </div>
        </div>
      )}
    </>
  );
}

/** Footer link: re-opens the consent bar (only meaningful when GTM is configured). */
export function PrivacySettingsLink() {
  if (!GTM_ID) return null;
  return <li><a href="#privacy-settings" onClick={(e) => { e.preventDefault(); dispatchEvent(new Event('mutabe3:consent')); }}>إعدادات الخصوصية</a></li>;
}
