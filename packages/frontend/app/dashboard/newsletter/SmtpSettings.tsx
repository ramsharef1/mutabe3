'use client';

import { useEffect, useState } from 'react';
import { adminFetch, jsonInit } from '../components/staff';

// Admin-only mail account settings (D-044). The password is write-only: the API
// never returns it, it is stored encrypted, and leaving the field empty keeps it.
interface Smtp { enabled: boolean; host: string; port: number; secure: boolean; user: string; fromName: string; fromEmail: string; hasPassword: boolean; passwordReadable: boolean | null; updatedAt: string | null }

const PRESETS: { id: string; label: string; host: string; port: number; secure: boolean; hint: string }[] = [
  { id: 'brevo', label: 'Brevo', host: 'smtp-relay.brevo.com', port: 587, secure: false, hint: 'اسم المستخدم هو بريد الدخول في Brevo، وكلمة المرور هي «SMTP key» من إعدادات SMTP & API.' },
  { id: 'ses', label: 'Amazon SES', host: 'email-smtp.eu-west-1.amazonaws.com', port: 587, secure: false, hint: 'غيّر المنطقة في اسم الخادم لتطابق حساب SES، واستخدم «SMTP credentials» المولّدة من SES لا مفاتيح IAM العادية.' },
  { id: 'mailgun', label: 'Mailgun', host: 'smtp.mailgun.org', port: 587, secure: false, hint: 'للحسابات الأوروبية استخدم smtp.eu.mailgun.org. اسم المستخدم مثل postmaster@mg.mutabe3.news.' },
  { id: 'gmail', label: 'Google Workspace / Gmail', host: 'smtp.gmail.com', port: 465, secure: true, hint: 'استخدم «كلمة مرور تطبيق» من إعدادات أمان Google، لا كلمة مرور الحساب. مناسب للأعداد الصغيرة فقط.' },
  { id: 'm365', label: 'Microsoft 365', host: 'smtp.office365.com', port: 587, secure: false, hint: 'يجب تفعيل «Authenticated SMTP» للحساب من لوحة Microsoft 365.' },
  { id: 'zoho', label: 'Zoho Mail', host: 'smtp.zoho.com', port: 465, secure: true, hint: 'للحسابات الأوروبية smtp.zoho.eu.' },
  { id: 'hostinger', label: 'بريد Hostinger', host: 'smtp.hostinger.com', port: 465, secure: true, hint: 'اسم المستخدم هو عنوان البريد الكامل وكلمة مروره من hPanel.' },
  { id: 'local', label: 'خادم الموقع نفسه', host: 'localhost', port: 25, secure: false, hint: 'بلا اسم مستخدم. يحتاج سجلات SPF وDKIM للنطاق كي لا تذهب الرسائل إلى المزعج.' },
];

export default function SmtpSettings({ onSaved }: { onSaved: () => void }) {
  const [s, setS] = useState<Smtp | null>(null);
  const [password, setPassword] = useState('');
  const [preset, setPreset] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    adminFetch('/api/admin/newsletter/smtp').then(async (r) => { if (r.ok) setS((await r.json()).data); }).catch(() => {});
  }, []);
  if (!s) return null;

  const set = (k: keyof Smtp, v: any) => { setS({ ...s, [k]: v }); setMsg(null); };
  const pick = (id: string) => {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id);
    if (p) setS({ ...s, host: p.host, port: p.port, secure: p.secure, user: id === 'local' ? '' : s.user });
    setMsg(null);
  };
  const body = () => ({ enabled: s.enabled, host: s.host, port: Number(s.port), secure: s.secure, user: s.user, fromName: s.fromName, fromEmail: s.fromEmail, ...(password ? { password } : {}) });

  const verify = async () => {
    setBusy(true); setMsg(null);
    const r = await adminFetch('/api/admin/newsletter/smtp/verify', jsonInit('POST', body()));
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg({ ok: false, t: j.error || 'تعذّر الاختبار.' });
    else setMsg(j.data?.ok ? { ok: true, t: 'نجح الاتصال وتسجيل الدخول. لم تُرسل أي رسالة.' } : { ok: false, t: `فشل الاتصال: ${j.data?.error || 'خطأ غير معروف'}` });
    setBusy(false);
  };
  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await adminFetch('/api/admin/newsletter/smtp', jsonInit('PUT', body()));
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setS(j.data); setPassword(''); setMsg({ ok: true, t: s.enabled ? 'حُفظت الإعدادات وأصبحت الرسائل تُرسل عبرها.' : 'حُفظت الإعدادات وهي غير مفعّلة.' }); onSaved(); }
    else setMsg({ ok: false, t: j.error || 'تعذّر الحفظ.' });
    setBusy(false);
  };

  const hint = PRESETS.find((p) => p.id === preset)?.hint;
  return (
    <section className="adm-card">
      <h2>إعدادات البريد المرسِل (SMTP)</h2>
      <p className="adm-note">بيانات حساب الإرسال من مزوّد البريد. تُحفظ كلمة المرور مشفّرة ولا تُعرض مرة أخرى. هذه الإعدادات تُستخدم للنشرة ولرسائل تفعيل الحسابات.</p>
      {s.hasPassword && s.passwordReadable === false && <div className="adm-err">كلمة المرور المحفوظة لم تعد قابلة للقراءة على الخادم. أعد إدخالها ثم احفظ.</div>}

      <label>المزوّد (تعبئة سريعة)
        <select value={preset} onChange={(e) => pick(e.target.value)}>
          <option value="">— اختر لتعبئة الخادم والمنفذ —</option>
          {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>
      {hint && <p className="adm-note">{hint}</p>}

      <div className="adm-row">
        <label>خادم SMTP<input value={s.host} onChange={(e) => set('host', e.target.value)} dir="ltr" placeholder="smtp.example.com" autoComplete="off" spellCheck={false} /></label>
        <label>المنفذ<input type="number" value={s.port} onChange={(e) => set('port', e.target.value)} dir="ltr" min={1} max={65535} /></label>
        <label>التشفير
          <select value={s.secure ? 'ssl' : 'starttls'} onChange={(e) => set('secure', e.target.value === 'ssl')}>
            <option value="starttls">STARTTLS (عادة 587)</option>
            <option value="ssl">SSL/TLS (عادة 465)</option>
          </select>
        </label>
      </div>
      <div className="adm-row">
        <label>اسم المستخدم<input value={s.user} onChange={(e) => set('user', e.target.value)} dir="ltr" autoComplete="off" spellCheck={false} placeholder="اتركه فارغاً إن لم يطلب الخادم تسجيل دخول" /></label>
        {/* new-password stops the browser from filling the dashboard login password here */}
        <label>كلمة المرور / مفتاح SMTP<input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setMsg(null); }} dir="ltr" autoComplete="new-password" placeholder={s.hasPassword ? 'محفوظة — اتركها فارغة للإبقاء عليها' : ''} /></label>
      </div>
      <div className="adm-row">
        <label>اسم المرسِل<input value={s.fromName} onChange={(e) => set('fromName', e.target.value)} maxLength={80} /></label>
        <label>عنوان المرسِل<input type="email" value={s.fromEmail} onChange={(e) => set('fromEmail', e.target.value)} dir="ltr" placeholder="noreply@mutabe3.news" /></label>
      </div>
      <label className="adm-check"><input type="checkbox" checked={s.enabled} onChange={(e) => set('enabled', e.target.checked)} /> أرسل كل رسائل الموقع عبر هذا الحساب</label>
      <p className="adm-note">عنوان المرسِل يجب أن يكون على نطاق مُعتمد لدى المزوّد، وأضف في DNS سجلات SPF وDKIM التي يعطيك إياها.</p>

      {msg && <div className={msg.ok ? 'adm-ok' : 'adm-err'} role="status">{msg.t}</div>}
      <div className="adm-inline">
        <button type="button" className="adm-logout" disabled={busy || !s.host} onClick={verify}>{busy ? '…' : 'اختبار الاتصال'}</button>
        <button type="button" className="adm-new" disabled={busy || !s.host} onClick={save}>{busy ? '…' : 'حفظ'}</button>
      </div>
      {s.updatedAt && <small className="adm-sub">آخر تعديل: {new Date(s.updatedAt).toLocaleString('ar-JO')}</small>}
    </section>
  );
}
