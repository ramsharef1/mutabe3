'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { track } from '../lib/track';

// Analytics + consent bar (D-055 / ANALYTICS-PLAN §3–4, D-074).
// GA4 direct (D-074, measurement id in lib/ga.ts): "Basic" consent — gtag.js is not loaded at all until the
// reader taps «موافق»; a refusal means no request to Google, ever, on this device (PDPL is consent-based,
// so no cookieless pings before consent). Only on the production hosts, never on staff pages; a signed-in
// staff member browsing the site is sent as traffic_type=internal (filter it in GA4).
// GTM (D-055, NEXT_PUBLIC_GTM_ID) is kept as the alternative: the container loads with storage denied
// ("Advanced") and the bar grants analytics_storage.
// The choice lives in localStorage (consent.v1), is asked again after 12 months, and the footer's
// «إعدادات الخصوصية» link re-opens the bar.
import { GA_ID, GA_HOSTS } from '../lib/ga';
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';
const ANALYTICS = !!(GTM_ID || GA_ID);
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

/** GA4 direct: queue the config once consent is given (gtag.js is added to the page at the same moment). */
function configureGa() {
  const w = window as Window & { __gaConfigured?: boolean };
  if (w.__gaConfigured || !window.gtag) return; // the layout's head script already did it for returning readers
  w.__gaConfigured = true;
  let staffBrowser = false;
  try { staffBrowser = !!localStorage.getItem('accessToken'); } catch {}
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, staffBrowser ? { traffic_type: 'internal' } : {});
}

export function Analytics() {
  const path = usePathname() || '/';
  // D-088: the bar is in the server HTML so it paints with the page (it is a first visit's largest element — waiting
  // for hydration put LCP at ~5 s on mobile). Readers who already chose never see it: the layout's pre-paint script
  // sets <html data-consent> and CSS hides the bar; the effect below then closes it for good.
  const [open, setOpen] = useState(true);
  const [host, setHost] = useState(true); // GA4 only on mutabe3.news itself (never localhost or a preview)
  const [loadGa, setLoadGa] = useState(false);
  const staff = STAFF.test(path);

  // The consent bar syncs with the browser's stored choice and loads GA after it (D-074, verified on production);
  // its state is set from that external read on purpose — rewriting it as derived state would re-test consent.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!ANALYTICS || staff) return;
    const onHost = GTM_ID ? true : GA_HOSTS.includes(location.hostname);
    setHost(onHost);
    if (!onHost) return;
    const s = read();
    if (s) { setOpen(false); applyConsent(s.analytics); if (s.analytics && GA_ID && !GTM_ID) { configureGa(); setLoadGa(true); } }
    else delete document.documentElement.dataset.consent; // stored choice expired: show the bar again
    const reopen = () => { delete document.documentElement.dataset.consent; setOpen(true); };
    addEventListener('mutabe3:consent', reopen);
    return () => removeEventListener('mutabe3:consent', reopen);
  }, [staff]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!ANALYTICS || staff || !host) return null;
  const choose = (analytics: boolean) => {
    write(analytics); applyConsent(analytics); setOpen(false);
    if (analytics && GA_ID && !GTM_ID) { configureGa(); setLoadGa(true); }
  };

  return (
    <>
      {loadGa && <Script id="ga4" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />}
      {GTM_ID && <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>}
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

/** Footer link: re-opens the consent bar (only meaningful when analytics is configured). */
export function PrivacySettingsLink() {
  if (!ANALYTICS) return null;
  return <li><a href="#privacy-settings" onClick={(e) => { e.preventDefault(); dispatchEvent(new Event('mutabe3:consent')); }}>إعدادات الخصوصية</a></li>;
}
