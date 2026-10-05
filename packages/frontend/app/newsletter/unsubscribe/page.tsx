'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SiteHeader, SiteFooter } from '../../components/site';

// Unsubscribe landing page from the link in every newsletter (D-043 Stage 4).
// A button, not an automatic action, so mail scanners that open links can't unsubscribe people.
function Unsubscribe() {
  const token = useSearchParams().get('token') || '';
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  const go = async () => {
    setState('busy');
    try {
      const r = await fetch('/api/newsletter/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setState('done'); setMsg(`أُلغي اشتراك ${j.email || 'بريدك'} في نشرة المتابع.`); }
      else { setState('err'); setMsg(j.error || 'تعذّر إلغاء الاشتراك.'); }
    } catch { setState('err'); setMsg('تعذّر الاتصال. حاول مجدداً.'); }
  };

  return (
    <div className="empty" style={{ margin: '60px auto', maxWidth: 560, textAlign: 'center' }}>
      <b style={{ display: 'block', fontSize: 22, marginBottom: 10 }}>إلغاء الاشتراك في النشرة</b>
      {!token ? <p>الرابط ناقص. استخدم رابط «إلغاء الاشتراك» الموجود أسفل رسالة النشرة.</p>
        : state === 'done' ? <p role="status">{msg} لن تصلك رسائل أخرى، ويمكنك الاشتراك من جديد في أي وقت من الصفحة الرئيسية.</p>
        : (
          <>
            <p>اضغط الزر لإيقاف رسائل نشرة المتابع إلى بريدك.</p>
            <p><button type="button" className="unsub-btn" onClick={go} disabled={state === 'busy'}>{state === 'busy' ? '…' : 'إلغاء الاشتراك'}</button></p>
            {state === 'err' && <p role="alert">{msg}</p>}
          </>
        )}
      <p><a href="/">العودة إلى الصفحة الرئيسية</a></p>
    </div>
  );
}

export default function Page() {
  return (
    <div className="am">
      <SiteHeader />
      <div className="wrap"><Suspense fallback={null}><Unsubscribe /></Suspense></div>
      <SiteFooter />
    </div>
  );
}
