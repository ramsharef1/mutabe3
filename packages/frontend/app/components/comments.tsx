'use client';

import { useEffect, useState } from 'react';
import { ago } from './util';

interface C { id: string; name: string; content: string; createdAt: string }

// Reader comments (D-043 Stage 4): approved comments are listed; new ones are held
// for an editor's approval. A hidden "website" field catches form-filling bots.
export function Comments({ articleId, enabled = true }: { articleId: string; enabled?: boolean }) {
  const [list, setList] = useState<C[] | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [text, setText] = useState('');
  const [hp, setHp] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    if (!enabled) { setList([]); return; }
    fetch(`/api/articles/${articleId}/comments`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setList(d.data || []))
      .catch(() => setList([]));
    try { setName(localStorage.getItem('cname') || ''); } catch {}
  }, [articleId, enabled]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (name.trim().length < 2) { setMsg({ ok: false, t: 'اكتب اسمك.' }); return; }
    if (text.trim().length < 3) { setMsg({ ok: false, t: 'اكتب تعليقك.' }); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/articles/${articleId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, content: text, website: hp }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ ok: false, t: j.error || 'تعذّر إرسال التعليق.' }); return; }
      try { localStorage.setItem('cname', name.trim()); } catch {}
      setText('');
      setMsg({ ok: true, t: 'شكراً لك. سيظهر تعليقك بعد مراجعته من المحرر.' });
    } catch {
      setMsg({ ok: false, t: 'تعذّر الاتصال. حاول مجدداً.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="comments" id="comments">
      <h4>التعليقات <span>({list ? list.length : '…'})</span></h4>
      {list && list.length > 0 && (
        <ul className="clist">
          {list.map((c) => (
            <li key={c.id}><i>{c.name.trim()[0] || '؟'}</i><div><b>{c.name}</b><small suppressHydrationWarning>{ago(c.createdAt)}</small><p>{c.content}</p></div></li>
          ))}
        </ul>
      )}
      {list && list.length === 0 && enabled && <p className="cempty">لا تعليقات بعد. كن أول من يعلّق.</p>}
      {enabled ? (
        <>
          <h4>أضف تعليقك</h4>
          <form onSubmit={submit} noValidate>
            <div className="row2">
              <input placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="الاسم" required />
              <input type="email" placeholder="البريد الإلكتروني (اختياري، لن يُنشر)" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="البريد الإلكتروني" dir="ltr" />
            </div>
            {/* honeypot: hidden from people, filled by bots */}
            <input className="hp" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} aria-hidden="true" name="website" />
            <textarea placeholder="اكتب تعليقك هنا..." value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} aria-label="التعليق" required />
            {msg && <div className={msg.ok ? 'cmsg ok' : 'cmsg err'} role="status">{msg.t}</div>}
            <div className="row2 send"><small className="cnt">{text.length}/2000</small><button type="submit" disabled={busy}>{busy ? 'جاري الإرسال…' : 'إرسال التعليق'}</button></div>
          </form>
          <small className="note">تخضع التعليقات للمراجعة قبل النشر، وتعبر عن رأي أصحابها ولا تعبر عن رأي الموقع. يُحذف أي تعليق يتضمن إساءة أو تحريضاً.</small>
        </>
      ) : <small className="note">التعليقات تُفعَّل بعد نشر المقال.</small>}
    </div>
  );
}
