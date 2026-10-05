'use client';

// Server-backed polls (D-043 Stage 4): one shared fetch for the homepage's poll and
// debate widgets, a random per-browser voter id, and the vote call.
import { useEffect, useState } from 'react';

export interface PollOpt { id: string; label: string; byline?: string | null; note?: string | null; votes: number }
export interface PollData { id: string; slot: string; question: string; total: number; options: PollOpt[] }
type Active = { home: PollData | null; debate: PollData | null };

let pending: Promise<Active> | null = null;
const loadActive = () => (pending ??= fetch('/api/polls/active').then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => d.data as Active).catch(() => ({ home: null, debate: null })));

export function voterId(): string {
  try {
    let v = localStorage.getItem('voterId');
    if (!v || !/^[A-Za-z0-9_-]{16,64}$/.test(v)) {
      const b = new Uint8Array(18);
      crypto.getRandomValues(b);
      v = btoa(Array.from(b, (x) => String.fromCharCode(x)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      localStorage.setItem('voterId', v);
    }
    return v;
  } catch {
    return `anon${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

export const myVote = (pollId: string) => { try { return localStorage.getItem(`poll:${pollId}`); } catch { return null; } };

/** The active poll for a slot ('home' | 'debate'), plus vote(). `undefined` while loading, `null` if none. */
export function usePoll(slot: 'home' | 'debate') {
  const [poll, setPoll] = useState<PollData | null | undefined>(undefined);
  const [mine, setMine] = useState<string | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    loadActive().then((a) => { const p = a[slot]; setPoll(p); if (p) setMine(myVote(p.id)); });
  }, [slot]);

  const vote = async (optionId: string) => {
    if (!poll || mine) return;
    setMine(optionId); // optimistic; the server answer replaces the counts
    setErr('');
    try {
      const r = await fetch(`/api/polls/${poll.id}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ optionId, voter: voterId() }) });
      const j = await r.json().catch(() => ({}));
      if (j.data) setPoll(j.data);
      if (r.ok || r.status === 409) { try { localStorage.setItem(`poll:${poll.id}`, optionId); } catch {} }
      else { setMine(null); setErr(j.error || 'تعذّر تسجيل صوتك'); }
    } catch {
      setMine(null);
      setErr('تعذّر الاتصال');
    }
  };
  return { poll, mine, vote, err };
}

export const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

/** Arabic count agreement: صوت واحد · صوتان · 3–10 أصوات · 11+ صوتاً */
export const votesAr = (n: number) => (n === 1 ? 'صوت واحد' : n === 2 ? 'صوتان' : n % 100 >= 3 && n % 100 <= 10 ? `${n} أصوات` : `${n} صوتاً`);
