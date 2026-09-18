'use client';

import { useState } from 'react';

export function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: Send to backend
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
        <p>لا تفوّت أهم أخبار الأردن والعالم</p>
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
