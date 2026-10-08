// Editor-managed homepage data blocks + live exchange rates (D-076). Fetched once per homepage render from
// GET /api/data; a block is present only while fresh, so a missing key means "show the illustrative version
// if the demo switch is on, otherwise nothing". Item shapes match the demo constants in components/feeds.ts.
import { API_BASE } from './api';

export type Row = Record<string, string | boolean>;
export interface Block { items: Row[]; updatedAt: string }
export interface Fx { day: string; usd: number; eur: number | null; eurChangePct: number | null; gulf: { c: string; n: string; v: number }[]; source: { name: string; url: string } }
export interface DataBlocks { alert?: Block; market?: Block; crossings?: Block; roads?: Block; services?: Block; royal?: Block; decisions?: Block; obits?: Block; jobs?: Block; facts?: Block; sixty?: Block; fx?: Fx | null }

export async function fetchData(): Promise<DataBlocks> {
  try {
    const r = await fetch(`${API_BASE}/api/data`, { next: { revalidate: 60 } });
    if (!r.ok) return {};
    return ((await r.json()).data || {}) as DataBlocks;
  } catch {
    return {};
  }
}

// Colours for the categories editors choose (the demo constants carry their own).
export const SERVICE_COLORS: Record<string, string> = { 'مياه': '#0277bd', 'كهرباء': '#8a5d00', 'رواتب': '#1b5e20', 'عطلة': '#6a1b9a', 'ضمان': '#4e342e', 'أخرى': '#455a64' };
export const DECISION_COLORS: Record<string, string> = { 'تعيين': '#1b5e20', 'إحالة': '#4e342e', 'نظام': '#0d47a1', 'عطاء': '#8a5d00', 'اتفاقية': '#6a1b9a', 'قرار': '#455a64' };
export const VERDICT_COLORS: Record<string, string> = { 'صحيح': '#1b5e20', 'خاطئ': '#c62828', 'مضلّل': '#8a5d00', 'غير دقيق': '#8a5d00' };

/** «ينتهي اليوم / غداً / خلال N أيام» for a job deadline (Amman calendar days). */
export function deadlineLabel(iso: string, now = new Date()) {
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman' }).format(d);
  const days = Math.round((new Date(day(new Date(iso))).getTime() - new Date(day(now)).getTime()) / 864e5);
  return days <= 0 ? 'ينتهي اليوم' : days === 1 ? 'ينتهي غداً' : days === 2 ? 'ينتهي بعد يومين' : days <= 10 ? `ينتهي خلال ${days} أيام` : `${days} يوماً`;
}
