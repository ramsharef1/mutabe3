// Editor-managed data blocks for the homepage (D-076, PLAN Q13): the weather alert, market rows, border
// crossings, roads, service notices, royal court, cabinet decisions, obituaries, jobs, fact-checks and «في 60 ثانية».
// Each block is one SiteSetting row "data.<type>" { items, updatedAt, updatedBy } — no schema change. A block
// is public only while fresh (its own rule below); otherwise the homepage falls back to the illustrative version
// while the demo switch is on, or hides it. Exchange rates come live from ExchangeRate-API (attribution shown).
import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from './generated/prisma/client';
import { localImage, safeHref } from './ads';
import { sendError } from './errors';

type Kind = 'text' | 'long' | 'select' | 'url' | 'image' | 'date' | 'datetime' | 'bool';
interface Field { name: string; label: string; kind: Kind; options?: string[]; required?: boolean; max?: number; hint?: string }
export interface BlockSpec { type: string; label: string; hint: string; fields: Field[]; maxItems: number; minItems?: number; maxAgeH?: number; single?: boolean }

const GOVS = ['عمّان', 'إربد', 'الزرقاء', 'البلقاء', 'مادبا', 'الكرك', 'الطفيلة', 'معان', 'العقبة', 'جرش', 'عجلون', 'المفرق'];
const STATUS = ['ok', 'warn', 'bad'];

export const SPECS: BlockSpec[] = [
  { type: 'alert', label: 'تنبيه الطقس والدوام', hint: 'يظهر أعلى الصفحة حتى موعد الانتهاء.', single: true, maxItems: 1, fields: [
    { name: 'title', label: 'العنوان', kind: 'text', required: true, max: 160 },
    { name: 'text', label: 'التفاصيل', kind: 'long', required: true, max: 400 },
    { name: 'closed', label: 'محافظات معطّلة الدوام', kind: 'text', max: 200, hint: 'مفصولة بفواصل: عجلون، جرش' },
    { name: 'open', label: 'محافظات بدوام عادي', kind: 'text', max: 200 },
    { name: 'expiresAt', label: 'ينتهي التنبيه', kind: 'datetime', required: true },
  ] },
  { type: 'market', label: 'لوحة الاقتصاد (بنود يدوية)', hint: 'الدولار واليورو يُحدّثان تلقائياً. أضف الذهب والبنزين والبورصة والتضخم. تختفي البنود بعد 35 يوماً دون تحديث.', maxItems: 4, maxAgeH: 35 * 24, fields: [
    { name: 'n', label: 'البند', kind: 'text', required: true, max: 40, hint: 'مثال: الذهب عيار 21 · عمّان' },
    { name: 'v', label: 'القيمة', kind: 'text', required: true, max: 20, hint: 'مثال: 61.40 د' },
    { name: 'd', label: 'الاتجاه', kind: 'select', options: ['up', 'down', 'flat'], required: true },
    { name: 's', label: 'التغير', kind: 'text', max: 20, hint: 'مثال: +0.9%' },
  ] },
  { type: 'crossings', label: 'المعابر والمطار', hint: 'تختفي بعد 24 ساعة دون تحديث.', maxItems: 6, maxAgeH: 24, fields: [
    { name: 'n', label: 'المعبر', kind: 'text', required: true, max: 40 },
    { name: 'st', label: 'الحالة', kind: 'select', options: STATUS, required: true },
    { name: 's', label: 'الوضع', kind: 'text', required: true, max: 60 },
    { name: 'w', label: 'الانتظار', kind: 'text', max: 30 },
  ] },
  { type: 'roads', label: 'حالة الطرق', hint: 'تختفي بعد 24 ساعة دون تحديث.', maxItems: 6, maxAgeH: 24, fields: [
    { name: 'n', label: 'الطريق', kind: 'text', required: true, max: 50 },
    { name: 'st', label: 'الحالة', kind: 'select', options: STATUS, required: true },
    { name: 's', label: 'الوضع', kind: 'text', required: true, max: 80 },
  ] },
  { type: 'services', label: 'خدمات ومواعيد (مياه، كهرباء، رواتب، عطل)', hint: 'تختفي بعد 7 أيام دون تحديث.', maxItems: 6, maxAgeH: 7 * 24, fields: [
    { name: 'k', label: 'النوع', kind: 'select', options: ['مياه', 'كهرباء', 'رواتب', 'عطلة', 'ضمان', 'أخرى'], required: true },
    { name: 'n', label: 'الخبر', kind: 'text', required: true, max: 80 },
    { name: 's', label: 'الموعد', kind: 'text', required: true, max: 40 },
  ] },
  { type: 'royal', label: 'الديوان الملكي العامر', hint: 'ثلاثة أنشطة؛ الصور من مكتبة الوسائط. تختفي بعد 3 أيام.', maxItems: 3, maxAgeH: 3 * 24, fields: [
    { name: 'k', label: 'الجهة', kind: 'select', options: ['جلالة الملك', 'جلالة الملكة', 'ولي العهد', 'الديوان الملكي'], required: true },
    { name: 't', label: 'النشاط', kind: 'text', required: true, max: 140 },
    { name: 'url', label: 'رابط الخبر', kind: 'url' },
    { name: 'img', label: 'الصورة', kind: 'image' },
  ] },
  { type: 'decisions', label: 'قرارات مجلس الوزراء وتعيينات', hint: 'تختفي بعد 10 أيام.', maxItems: 6, maxAgeH: 10 * 24, fields: [
    { name: 'k', label: 'النوع', kind: 'select', options: ['تعيين', 'إحالة', 'نظام', 'عطاء', 'اتفاقية', 'قرار'], required: true },
    { name: 't', label: 'القرار', kind: 'text', required: true, max: 160 },
    { name: 'url', label: 'رابط الخبر', kind: 'url' },
  ] },
  { type: 'obits', label: 'الوفيات', hint: 'تختفي بعد 3 أيام دون تحديث.', maxItems: 12, maxAgeH: 3 * 24, fields: [
    { name: 'n', label: 'اسم المتوفى', kind: 'text', required: true, max: 80 },
    { name: 'a', label: 'مكان بيت العزاء', kind: 'text', required: true, max: 60 },
    { name: 'h', label: 'أوقات العزاء', kind: 'text', max: 30 },
    { name: 'gov', label: 'المحافظة', kind: 'select', options: GOVS, required: true },
  ] },
  { type: 'jobs', label: 'وظائف وعطاءات', hint: 'يختفي كل بند بعد موعده النهائي.', maxItems: 8, fields: [
    { name: 't', label: 'الوظيفة أو العطاء', kind: 'text', required: true, max: 100 },
    { name: 's', label: 'الجهة', kind: 'text', required: true, max: 60 },
    { name: 'deadline', label: 'آخر موعد', kind: 'date', required: true },
    { name: 'urgent', label: 'عاجل', kind: 'bool' },
    { name: 'url', label: 'رابط', kind: 'url' },
  ] },
  { type: 'facts', label: 'تحقق المتابع', hint: 'ثلاثة ادعاءات. تختفي بعد 30 يوماً.', maxItems: 3, maxAgeH: 30 * 24, fields: [
    { name: 'c', label: 'الادعاء', kind: 'text', required: true, max: 140 },
    { name: 'v', label: 'الحكم', kind: 'select', options: ['صحيح', 'خاطئ', 'مضلّل', 'غير دقيق'], required: true },
    { name: 'url', label: 'رابط التحقق', kind: 'url' },
  ] },
  { type: 'sixty', label: 'في 60 ثانية', hint: 'ثلاث فقرات بالترتيب: ماذا حدث، لماذا يهم، ما التالي. تختفي بعد 48 ساعة.', maxItems: 3, minItems: 3, maxAgeH: 48, fields: [
    { name: 'b', label: 'العنوان', kind: 'text', required: true, max: 100 },
    { name: 'p', label: 'الفقرة', kind: 'long', required: true, max: 300 },
  ] },
];
const SPEC = new Map(SPECS.map((s) => [s.type, s]));
const keyOf = (type: string) => `data.${type}`;
type Row = Record<string, string | boolean>;
interface Stored { items: Row[]; updatedAt: string; updatedBy?: string }

const text = (v: unknown, max: number) => String(v ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Validate one block's rows against its spec; returns clean rows or an Arabic error. */
export function parseBlock(type: string, body: unknown): { ok: true; items: Row[] } | { ok: false; error: string } {
  const spec = SPEC.get(type);
  if (!spec) return { ok: false, error: 'نوع غير معروف' };
  const rows = Array.isArray((body as any)?.items) ? (body as any).items : null;
  if (!rows) return { ok: false, error: 'items[] مطلوبة' };
  if (rows.length > spec.maxItems) return { ok: false, error: `${spec.maxItems} بنود كحد أقصى` };
  if (rows.length && spec.minItems && rows.length < spec.minItems) return { ok: false, error: `يلزم ${spec.minItems} بنود` };
  const out: Row[] = [];
  for (const [i, raw] of rows.entries()) {
    const row: Row = {};
    for (const f of spec.fields) {
      const v = raw?.[f.name];
      let val: string | boolean | null = null;
      if (f.kind === 'bool') val = !!v;
      else if (f.kind === 'select') val = f.options!.includes(String(v)) ? String(v) : null;
      else if (f.kind === 'url') val = v ? safeHref(String(v).trim().slice(0, 300)) : '';
      else if (f.kind === 'image') val = v ? localImage(v) : '';
      else if (f.kind === 'date' || f.kind === 'datetime') { const d = v ? new Date(String(v)) : null; val = d && !isNaN(d.getTime()) ? d.toISOString() : null; }
      else val = text(v, f.max || 200);
      if (val === null && (f.required || v)) return { ok: false, error: `البند ${i + 1}: «${f.label}» غير صالح` };
      if (f.required && (val === '' || val === null)) return { ok: false, error: `البند ${i + 1}: «${f.label}» مطلوب` };
      row[f.name] = val ?? '';
    }
    out.push(row);
  }
  return { ok: true, items: out };
}

export async function readBlock(prisma: PrismaClient, type: string): Promise<Stored | null> {
  const r = await prisma.siteSetting.findUnique({ where: { key: keyOf(type) } });
  return r ? (r.value as unknown as Stored) : null;
}

export async function writeBlock(prisma: PrismaClient, type: string, items: Row[], by: string) {
  if (!items.length) { await prisma.siteSetting.deleteMany({ where: { key: keyOf(type) } }); return null; }
  const value: Stored = { items, updatedAt: new Date().toISOString(), updatedBy: by };
  await prisma.siteSetting.upsert({ where: { key: keyOf(type) }, update: { value: value as unknown as Prisma.InputJsonObject }, create: { key: keyOf(type), value: value as unknown as Prisma.InputJsonObject } });
  return value;
}

/** What readers may see now: fresh blocks only, expired rows dropped. */
export function publicItems(spec: BlockSpec, s: Stored | null, now = Date.now()): Row[] | null {
  if (!s?.items?.length) return null;
  if (spec.maxAgeH && now - new Date(s.updatedAt).getTime() > spec.maxAgeH * 3_600_000) return null;
  let items = s.items;
  if (spec.type === 'alert') items = items.filter((r) => new Date(String(r.expiresAt)).getTime() > now);
  if (spec.type === 'jobs') items = items.filter((r) => new Date(String(r.deadline)).getTime() + 86_400_000 > now); // through the deadline day
  return items.length ? items : null;
}

/* ── exchange rates: ExchangeRate-API open endpoint (no key; attribution required), refreshed every 6 h ── */
const FX_KEY = 'data.fx';
const FX_URL = 'https://open.er-api.com/v6/latest/USD';
interface FxDay { day: string; rates: Record<string, number> }
interface FxStore { current: FxDay; previous?: FxDay; fetchedAt: string }
let fxMem: FxStore | null = null;
let fxBusy: Promise<void> | null = null;

async function refreshFx(prisma: PrismaClient) {
  const r = await fetch(FX_URL, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`fx ${r.status}`);
  const j: any = await r.json();
  if (j?.result !== 'success' || typeof j?.rates?.JOD !== 'number') throw new Error('fx payload');
  const day = new Date(j.time_last_update_utc || Date.now()).toISOString().slice(0, 10);
  const keep = ['JOD', 'EUR', 'GBP', 'SAR', 'AED', 'QAR', 'KWD', 'EGP'];
  const rates = Object.fromEntries(keep.filter((c) => typeof j.rates[c] === 'number').map((c) => [c, j.rates[c]]));
  const old = fxMem || ((await prisma.siteSetting.findUnique({ where: { key: FX_KEY } }))?.value as unknown as FxStore | undefined) || null;
  const next: FxStore = old && old.current.day !== day ? { current: { day, rates }, previous: old.current, fetchedAt: new Date().toISOString() }
    : { current: { day, rates }, previous: old?.previous, fetchedAt: new Date().toISOString() };
  fxMem = next;
  await prisma.siteSetting.upsert({ where: { key: FX_KEY }, update: { value: next as unknown as Prisma.InputJsonObject }, create: { key: FX_KEY, value: next as unknown as Prisma.InputJsonObject } });
}

/** Latest stored rates (refreshed in the background when older than 6 h). */
export async function readFx(prisma: PrismaClient): Promise<FxStore | null> {
  if (!fxMem) fxMem = ((await prisma.siteSetting.findUnique({ where: { key: FX_KEY } }))?.value as unknown as FxStore) || null;
  const stale = !fxMem || Date.now() - new Date(fxMem.fetchedAt).getTime() > 6 * 3_600_000;
  if (stale && !fxBusy) fxBusy = refreshFx(prisma).catch((e) => console.warn('[fx] refresh failed:', (e as Error).message)).finally(() => { fxBusy = null; });
  if (!fxMem && fxBusy) await fxBusy; // first run: wait once
  return fxMem;
}

/** JOD per one unit of each currency, and the euro's day-on-day change. */
export function fxView(s: FxStore | null) {
  if (!s) return null;
  const jod = s.current.rates.JOD;
  const per = (c: string, rates = s.current.rates) => (rates[c] ? jod / rates[c] : null);
  const prevEur = s.previous ? (s.previous.rates.JOD / s.previous.rates.EUR) : null;
  const eur = per('EUR');
  return {
    day: s.current.day,
    usd: jod,
    eur,
    eurChangePct: eur && prevEur ? ((eur - prevEur) / prevEur) * 100 : null,
    gulf: [['SAR', 'ريال سعودي'], ['AED', 'درهم إماراتي'], ['QAR', 'ريال قطري'], ['KWD', 'دينار كويتي']]
      .map(([c, n]) => ({ c, n, v: per(c) })).filter((x) => x.v),
    source: { name: 'ExchangeRate-API', url: 'https://www.exchangerate-api.com' },
  };
}

/** GET /api/data — every fresh block + exchange rates, in one call for the homepage. */
export function dataRoutes(prisma: PrismaClient) {
  const router = Router();
  router.get('/data', async (_req: Request, res: Response) => {
    try {
      const rows = await prisma.siteSetting.findMany({ where: { key: { in: SPECS.map((s) => keyOf(s.type)) } } });
      const byKey = new Map(rows.map((r) => [r.key, r.value as unknown as Stored]));
      const data: Record<string, { items: Row[]; updatedAt: string }> = {};
      for (const spec of SPECS) {
        const s = byKey.get(keyOf(spec.type)) || null;
        const items = publicItems(spec, s);
        if (items) data[spec.type] = { items, updatedAt: s!.updatedAt };
      }
      res.json({ success: true, data: { ...data, fx: fxView(await readFx(prisma)) } });
    } catch (e) { sendError(res, e); }
  });
  return router;
}
