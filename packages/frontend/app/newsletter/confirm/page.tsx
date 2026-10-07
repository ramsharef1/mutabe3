'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SiteHeader, SiteFooter } from '../../components/site';

// Double opt-in landing page (D-054): the link in the confirmation mail opens this page and a
// button completes the subscription, so mail scanners that prefetch links cannot confirm by accident.
function Confirm() {
  const token = useSearchParams().get('token') || '';
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  const go = async () => {
    setState('busy');
    try {
      const r = await fetch('/api/newsletter/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setState('done'); setMsg(`تم تأكيد اشتراك ${j.email || 'بريدك'} في نشرة المتابع.`); }
      else { setState('err'); setMsg(j.error || 'تعذّر تأكيد الاشتراك.'); }
    } catch { setState('err'); setMsg('تعذّر الاتصال. حاول مجدداً.'); }
  };

  return (
    <div className="empty" style={{ margin: '60px auto', maxWidth: 560, textAlign: 'center' }}>
      <b style={{ display: 'block', fontSize: 22, marginBottom: 10 }}>تأكيد الاشتراك في النشرة</b>
      {!token ? <p>الرابط ناقص. استخدم زر «تأكيد الاشتراك» الموجود في رسالة التأكيد.</p>
        : state === 'done' ? <p role="status">{msg} ستصلك النشرة الصباحية، ويمكنك إلغاء الاشتراك في أي وقت من رابط أسفل كل رسالة.</p>
        : (
          <>
            <p>اضغط الزر لتأكيد أنك تريد استلام نشرة المتابع على هذا البريد.</p>
            <p><button type="button" className="unsub-btn" onClick={go} disabled={state === 'busy'}>{state === 'busy' ? '…' : 'تأكيد الاشتراك'}</button></p>
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
      <div className="wrap"><Suspense fallback={null}><Confirm /></Suspense></div>
      <SiteFooter />
    </div>
  );
}
