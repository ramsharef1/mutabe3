// Data feeds for the homepage blocks. Everything here is either computed (prayer times, Hijri date,
// weather from Open-Meteo) or demo content shaped like the real feed it will be replaced by.
import type { Article } from './util';

/* ---------------- helpers ---------------- */
export const hijri = (d = new Date()) =>
  new Intl.DateTimeFormat('ar-JO-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(d) + ' هـ';
export const ammanDate = (d = new Date()) =>
  new Intl.DateTimeFormat('ar-JO-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Amman' }).format(d);
export const ammanTime = (d = new Date()) =>
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman' }).format(d);

/* ---------------- prayer times (Amman; Fajr 18°, Isha 18°, Shafi'i Asr) ---------------- */
const rad = (x: number) => (x * Math.PI) / 180, deg = (x: number) => (x * 180) / Math.PI;
export function prayerTimes(date = new Date(), lat = 31.9539, lng = 35.9106, tz = 3) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  // Julian day
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  const jd = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045 - 0.5;
  const D = jd - 2451545.0;
  const g = rad((357.529 + 0.98560028 * D) % 360), q = (280.459 + 0.98564736 * D) % 360;
  const L = rad((q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360);
  const e = rad(23.439 - 0.00000036 * D);
  const RA = deg(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))) / 15;
  const decl = deg(Math.asin(Math.sin(e) * Math.sin(L)));
  const eqt = q / 15 - ((RA % 24) + 24) % 24;
  const noon = 12 - lng / 15 + tz - eqt;
  const hourAngle = (ang: number) => {
    const c = (-Math.sin(rad(ang)) - Math.sin(rad(lat)) * Math.sin(rad(decl))) / (Math.cos(rad(lat)) * Math.cos(rad(decl)));
    return deg(Math.acos(Math.max(-1, Math.min(1, c)))) / 15;
  };
  const asrAngle = -deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(lat - decl))))));
  const t = {
    fajr: noon - hourAngle(18), sunrise: noon - hourAngle(0.833), dhuhr: noon + 0.02, asr: noon + hourAngle(asrAngle),
    maghrib: noon + hourAngle(0.833), isha: noon + hourAngle(18),
  };
  const fmt = (h: number) => { const hh = ((h % 24) + 24) % 24; const H = Math.floor(hh), M = Math.round((hh - H) * 60); return `${String((H + (M === 60 ? 1 : 0)) % 24).padStart(2, '0')}:${String(M % 60).padStart(2, '0')}`; };
  return [
    { k: 'fajr', n: 'الفجر', t: fmt(t.fajr), h: t.fajr }, { k: 'sunrise', n: 'الشروق', t: fmt(t.sunrise), h: t.sunrise },
    { k: 'dhuhr', n: 'الظهر', t: fmt(t.dhuhr), h: t.dhuhr }, { k: 'asr', n: 'العصر', t: fmt(t.asr), h: t.asr },
    { k: 'maghrib', n: 'المغرب', t: fmt(t.maghrib), h: t.maghrib }, { k: 'isha', n: 'العشاء', t: fmt(t.isha), h: t.isha },
  ];
}
export type Prayer = ReturnType<typeof prayerTimes>[number];

/* ---------------- weather (Open-Meteo, free, no key) ---------------- */
export const GOVS = [
  { n: 'عمّان', lat: 31.95, lng: 35.93 }, { n: 'إربد', lat: 32.55, lng: 35.85 }, { n: 'الزرقاء', lat: 32.07, lng: 36.09 },
  { n: 'العقبة', lat: 29.53, lng: 35.01 }, { n: 'معان', lat: 30.19, lng: 35.73 }, { n: 'الكرك', lat: 31.18, lng: 35.7 },
  { n: 'البلقاء', lat: 32.04, lng: 35.73 }, { n: 'المفرق', lat: 32.34, lng: 36.21 }, { n: 'جرش', lat: 32.27, lng: 35.9 },
  { n: 'عجلون', lat: 32.33, lng: 35.75 }, { n: 'مادبا', lat: 31.72, lng: 35.8 }, { n: 'الطفيلة', lat: 30.84, lng: 35.6 },
];
export interface Wx { n: string; t: number; code: number }
export async function fetchWeather(): Promise<Wx[]> {
  try {
    const lat = GOVS.map((g) => g.lat).join(','), lng = GOVS.map((g) => g.lng).join(',');
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=Asia%2FAmman`, { next: { revalidate: 900 } });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const arr = Array.isArray(j) ? j : [j];
    // A governorate without a reading is left out — never a made-up temperature (D-089).
    return GOVS.flatMap((g, i) => {
      const t = arr[i]?.current?.temperature_2m;
      return typeof t === 'number' ? [{ n: g.n, t: Math.round(t), code: arr[i]?.current?.weather_code ?? 0 }] : [];
    });
  } catch {
    return [];
  }
}
export const wxIcon = (c: number) => (c === 0 ? '☀' : c <= 3 ? '⛅' : c <= 48 ? '🌫' : c <= 67 ? '🌧' : c <= 77 ? '❄' : c <= 82 ? '🌦' : '⛈');
export const wxText = (c: number) => (c === 0 ? 'صحو' : c <= 3 ? 'غائم جزئياً' : c <= 48 ? 'ضباب' : c <= 67 ? 'أمطار' : c <= 77 ? 'ثلوج' : c <= 82 ? 'زخات' : 'عواصف');

/* ---------------- editorial flags ---------------- */
// The breaking bar is set from /dashboard/homepage (D-043 Stage 3); nothing is "breaking" unless an editor
// says so. Editor's picks come from the same page, labelled samples while the demo switch is on (D-091).
export interface BreakingItem { title: string; href: string; at: string }

/* ---------------- market strip ---------------- */
// Only when the live rates are unreachable and the desk has no rows (D-091): the labels, no invented numbers.
export const MARKET = [
  { n: 'دولار / دينار', v: '—', d: 0, s: 'مثال' }, { n: 'يورو / دينار', v: '—', d: 0, s: 'مثال' },
  { n: 'الذهب عيار 21', v: '—', d: 0, s: 'مثال' }, { n: 'مؤشر بورصة عمّان', v: '—', d: 0, s: 'مثال' },
];

/* ---------------- sample data blocks (D-091) ----------------
 * Shown only while the demo switch is on and the desk has not filled the block on «البيانات». Every item is a
 * labelled example of what the block carries — never an event, a number or a name presented as real: no real
 * person, no decision or statement attributed to a real office (D-089 removed the invented ones). */
export const MET_ALERT: null | { level: string; title: string; text: string; closures: { n: string; off: boolean }[] } = {
  level: 'مثال',
  title: 'مثال: هكذا يظهر تنبيه الأرصاد الجوية',
  text: 'عند صدور تحذير رسمي من دائرة الأرصاد الجوية أو قرار بتعليق الدوام يظهر هنا مع المحافظات المعنية.',
  closures: [],
};

/* ---------------- crossings / roads / services ---------------- */
export const CROSSINGS = [
  { n: 'جسر الملك حسين', st: '', s: 'الحالة وأوقات الانتظار تظهر هنا عند تحديثها', w: '—' }, { n: 'معبر جابر', st: '', s: 'الحالة تظهر هنا عند تحديثها', w: '—' },
  { n: 'معبر العمري', st: '', s: 'الحالة تظهر هنا عند تحديثها', w: '—' }, { n: 'مطار الملكة علياء', st: '', s: 'حركة الرحلات تظهر هنا عند تحديثها', w: '—' },
];
export const ROADS = [
  { n: 'مثال: طريق رئيسي في عمّان', st: '', s: 'الحالة المرورية والتحويلات تظهر هنا' }, { n: 'مثال: طريق بين المحافظات', st: '', s: 'الإغلاقات والازدحام تظهر هنا' },
  { n: 'مثال: نفق أو دوّار', st: '', s: 'أعمال الصيانة ومواعيدها تظهر هنا' },
];
export const SERVICES = [
  { k: 'مياه', c: '#0277bd', n: 'مثال: مواعيد انقطاع المياه المبرمجة', s: 'المنطقة والموعد' }, { k: 'كهرباء', c: '#8a5d00', n: 'مثال: الصيانة المبرمجة للكهرباء', s: 'المنطقة والموعد' },
  { k: 'رواتب', c: '#1b5e20', n: 'مثال: موعد صرف الرواتب', s: 'التاريخ من الجهة الرسمية' }, { k: 'عطلة', c: '#6a1b9a', n: 'مثال: العطلة الرسمية القادمة', s: 'التاريخ من الجهة الرسمية' },
];

/* ---------------- state ---------------- */
export const ROYAL: { k: string; t: string; url?: string; img?: string }[] = [
  { k: 'الديوان الملكي', t: 'مثال: أخبار الديوان الملكي الهاشمي تظهر هنا من مصادرها الرسمية' },
  { k: 'جلالة الملك', t: 'مثال: نشاطات جلالة الملك ولقاءاته كما يعلنها الديوان' },
  { k: 'ولي العهد', t: 'مثال: نشاطات سمو ولي العهد كما يعلنها الديوان' },
];
export const DECISIONS = [
  { k: 'تعيين', c: '#1b5e20', t: 'مثال: التعيينات التي يقرّها مجلس الوزراء' }, { k: 'نظام', c: '#0d47a1', t: 'مثال: الأنظمة والتعديلات المقرّة' },
  { k: 'عطاء', c: '#8a5d00', t: 'مثال: العطاءات المحالة' }, { k: 'اتفاقية', c: '#6a1b9a', t: 'مثال: الاتفاقيات والمنح الموقّعة' },
];
export const VOTE = {
  bill: 'مثال: مشروع قانون في قراءته الثانية', date: 'تاريخ الجلسة', yes: 60, no: 30, abs: 10,
  mps: [
    { n: 'اسم النائب (مثال)', d: 'الدائرة', p: 'الحزب أو الكتلة', v: 'مع' }, { n: 'اسم النائبة (مثال)', d: 'الدائرة', p: 'الحزب أو الكتلة', v: 'ضد' },
    { n: 'نائب ثالث (مثال)', d: 'الدائرة', p: 'مستقل', v: 'غياب' },
  ],
};

/* ---------------- seasonal ---------------- */
export type Season = 'tawjihi' | 'ramadan' | 'elections' | null;
export function currentSeason(d = new Date()): Season {
  const m = d.getMonth() + 1;
  if (m === 7 || m === 8) return 'tawjihi';
  try {
    const hm = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric' }).format(d);
    if (parseInt(hm, 10) === 9) return 'ramadan';
  } catch {}
  return null;
}
// Results day placeholder: 20 July of the current or next year, whichever is ahead.
const nextJuly20 = () => { const n = new Date(); const y = n.getTime() > new Date(`${n.getFullYear()}-07-20T10:00:00+03:00`).getTime() ? n.getFullYear() + 1 : n.getFullYear(); return `${y}-07-20T10:00:00+03:00`; };
export const TAWJIHI = { resultsAt: nextJuly20(), topline: 'أوائل الأردن 2026 · نسب النجاح بالمحافظات · دليل القبول الموحد' };
export const ELECTIONS = [{ n: 'الدائرة الأولى — عمّان', v: 'فُرز 82%' }, { n: 'إربد الأولى', v: 'فُرز 64%' }, { n: 'القوائم الحزبية العامة', v: '41 مقعداً' }, { n: 'الزرقاء الأولى', v: 'فُرز 71%' }];

/* ---------------- sports / diaspora ---------------- */
// Sample fixture (D-091): 20:00 Amman a week ahead, no real teams or standings. Rounded to the day so the server
// render and the browser compute the same time (hydration).
const sampleKickoff = () => { const d = new Date(Date.now() + 7 * 864e5); d.setUTCHours(17, 0, 0, 0); return d.toISOString(); };
export const MATCH = { home: 'المنتخب', away: 'المنافس', at: sampleKickoff(), venue: 'الملعب', comp: 'مثال: المباراة القادمة' };
export const LEAGUE = [['النادي (مثال)', 0, 0], ['نادٍ ثانٍ (مثال)', 0, 0], ['نادٍ ثالث (مثال)', 0, 0]] as [string, number, number][];
export const FX = [['ريال سعودي ← دينار', '—'], ['درهم إماراتي ← دينار', '—'], ['ريال قطري ← دينار', '—'], ['دينار كويتي ← دينار', '—']]; // only if the live rates are unreachable (D-091)
export const CLOCKS = [['عمّان', 'Asia/Amman'], ['الرياض', 'Asia/Riyadh'], ['دبي', 'Asia/Dubai'], ['الدوحة', 'Asia/Qatar'], ['نيويورك', 'America/New_York']];
export const GULF_TZ = ['Asia/Riyadh', 'Asia/Dubai', 'Asia/Qatar', 'Asia/Kuwait', 'Asia/Bahrain', 'Asia/Muscat'];

/* ---------------- community ---------------- */
export const UGC = [
  { img: 'https://picsum.photos/id/397/600/400', loc: 'المكان', ago: 'مثال', t: 'مثال: صورة أو خبر يرسله قارئ — يُنشر هنا بعد مراجعته تحريرياً.' },
];
export const GREETINGS = [
  { k: 'نجاح', c: '#1b5e20', t: 'مثال: تهنئة بالنجاح باسم صاحبها ومناسبتها' }, { k: 'زفاف', c: '#ad1457', t: 'مثال: تهنئة بالزفاف' },
  { k: 'تخرج', c: '#0d47a1', t: 'مثال: تهنئة بالتخرج' }, { k: 'مولود', c: '#8a5d00', t: 'مثال: تهنئة بمولود جديد' },
];
export const MEMORY = { date: 'مثال', t: 'حدث من تاريخ الأردن في مثل هذا اليوم', p: 'يختار التحرير كل يوم حدثاً موثّقاً من الأرشيف مع مصدره وصوره.', img: 'https://picsum.photos/id/409/600/400' };

/* ---------------- obituaries ---------------- */
export const OBITS = [
  { n: 'اسم الفقيد (مثال)', a: 'مكان بيت العزاء', h: 'موعد العزاء', gov: 'المحافظة' },
  { n: 'اسم الفقيدة (مثال)', a: 'مكان بيت العزاء', h: 'موعد العزاء', gov: 'المحافظة' },
];

/* ---------------- jobs ---------------- */
export const JOBS = [
  { t: 'مثال: إعلان وظائف في القطاع العام', s: 'الجهة المعلِنة', urgent: false, d: 'آخر موعد' }, { t: 'مثال: عطاء حكومي', s: 'الجهة المعلِنة', urgent: false, d: 'آخر موعد' },
  { t: 'مثال: وظيفة في القطاع الخاص', s: 'المدينة · نوع الدوام', urgent: false, d: 'آخر موعد' },
];

/* ---------------- fact-check / sixty ---------------- */
export const FACTS = [
  { c: 'مثال: ادعاء منتشر على وسائل التواصل', v: 'خاطئ', col: '#c62828' }, { c: 'مثال: ادعاء ثبتت صحته', v: 'صحيح', col: '#1b5e20' },
  { c: 'مثال: ادعاء ينقصه السياق', v: 'مضلّل', col: '#8a5d00' },
];
export const SIXTY = [
  { k: 'ماذا حدث', b: 'مثال: قصة اليوم في سطر', p: 'يلخّص التحرير كل صباح القصة الأهم في ثلاث بطاقات قصيرة.' },
  { k: 'لماذا يهم', b: 'مثال: أثرها على القارئ', p: 'ما الذي يتغيّر في حياة الناس أو جيوبهم.' },
  { k: 'ما التالي', b: 'مثال: ما الذي ينتظره الناس بعدها', p: 'الموعد أو الخطوة القادمة في القصة.' },
];

/* ---------------- exclusive article pools (B1) ---------------- */
export class Pool {
  private i = 0;
  constructor(private list: Article[]) {}
  /** The next n articles; fewer (or none) once the list is used up — never a story twice (D-089: it used to wrap around). */
  take(n: number): Article[] {
    const out = this.list.slice(this.i, this.i + n);
    this.i += out.length;
    return out;
  }
  /** Articles not yet handed out (used for “آخر الأنباء” so the fold never repeats). */
  rest(n: number) { return this.take(n); }
}
