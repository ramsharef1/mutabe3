'use client';

import { useEffect, useState } from 'react';

const EDITIONS = ['سياسة', 'اقتصاد', 'رياضة', 'فلسطين'];

export function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [picks, setPicks] = useState<string[]>([]);

  useEffect(() => {
    try {
      setPicks(JSON.parse(localStorage.getItem('editions') || '[]'));
    } catch {}
  }, []);

  const toggle = (t: string) => {
    setPicks((prev) => {
      const next = prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t];
      try {
        localStorage.setItem('editions', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: backend wires the picked editions to delivery; preference persists locally for now.
    setSubmitted(true);
    setTimeout(() => {
      setEmail('');
      setSubmitted(false);
    }, 3000);
  }

  return (
    <div className="news-cta">
      <div className="content">
        <h3>اشترك في النشرة اليومية</h3>
        <p>اختر نشراتك — يصلك ملخّصها كل صباح</p>
      </div>

      <div className="editions" role="group" aria-label="نشرات حسب القسم">
        {EDITIONS.map((t) => (
          <button type="button" key={t} className={`ed ${picks.includes(t) ? 'on' : ''}`} onClick={() => toggle(t)} aria-pressed={picks.includes(t)}>
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="بريدك الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={submitted}
        />
        <button type="submit" disabled={submitted}>
          {submitted ? '✓ تم' : 'اشترك'}
        </button>
      </form>
    </div>
  );
}
