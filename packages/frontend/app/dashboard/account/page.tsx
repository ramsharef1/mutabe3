'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Account() {
  const router = useRouter();
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { try { if (!localStorage.getItem('accessToken')) router.replace('/auth/login'); } catch {} }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setMsg('');
    if (nw !== confirm) { setErr('كلمتا المرور غير متطابقتين.'); return; }
    if (nw.length < 8) { setErr('كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.'); return; }
    setSaving(true);
    try {
      const t = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ currentPassword: cur, newPassword: nw }),
      });
      if (res.status === 401 && !(await res.clone().json().catch(() => ({})))?.error?.includes?.('الحالية')) {
        router.replace('/auth/login'); return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error || 'تعذّر تغيير كلمة المرور.'); setSaving(false); return; }
      setMsg('تم تغيير كلمة المرور بنجاح.');
      setCur(''); setNw(''); setConfirm('');
    } catch { setErr('تعذّر الاتصال.'); }
    setSaving(false);
  };

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-brand"><a href="/dashboard" className="adm-back">‹ لوحة التحكم</a></div>
      </header>
      <main className="adm-main adm-editor" style={{ maxWidth: 460 }}>
        <h1>تغيير كلمة المرور</h1>
        {msg && <div className="adm-ok">{msg}</div>}
        {err && <div className="adm-err">{err}</div>}
        <form onSubmit={submit}>
          <label>كلمة المرور الحالية<input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></label>
          <label>كلمة المرور الجديدة<input type="password" value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" /></label>
          <label>تأكيد كلمة المرور الجديدة<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></label>
          <button type="submit" className="adm-new" disabled={saving}>{saving ? '…' : 'حفظ'}</button>
        </form>
      </main>
    </div>
  );
}
