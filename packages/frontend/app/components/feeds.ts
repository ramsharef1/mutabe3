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
    return GOVS.map((g, i) => ({ n: g.n, t: Math.round(arr[i]?.current?.temperature_2m ?? 24), code: arr[i]?.current?.weather_code ?? 0 }));
  } catch {
    return GOVS.map((g, i) => ({ n: g.n, t: [27, 25, 28, 36, 29, 26, 27, 30, 24, 23, 28, 25][i], code: 0 }));
  }
}
export const wxIcon = (c: number) => (c === 0 ? '☀' : c <= 3 ? '⛅' : c <= 48 ? '🌫' : c <= 67 ? '🌧' : c <= 77 ? '❄' : c <= 82 ? '🌦' : '⛈');
export const wxText = (c: number) => (c === 0 ? 'صحو' : c <= 3 ? 'غائم جزئياً' : c <= 48 ? 'ضباب' : c <= 67 ? 'أمطار' : c <= 77 ? 'ثلوج' : c <= 82 ? 'زخات' : 'عواصف');

/* ---------------- editorial flags (demo) ---------------- */
export const BREAKING = { // set to null when nothing is breaking → ticker falls back to «آخر الأخبار»
  title: 'الحكومة تقرّ تعديلات على قانون الضريبة العامة على المبيعات وتخفّض الضريبة على 12 سلعة أساسية',
  at: new Date(Date.now() - 6 * 60000).toISOString(), href: '/article/art-001',
};
export const PICKS = ['art-001', 'art-006', 'art-010', 'art-014', 'art-017'];

/* ---------------- market strip ---------------- */
export const MARKET = [
  { n: 'دولار / دينار', v: '0.709', d: 0, s: '0.00' }, { n: 'يورو / دينار', v: '0.771', d: -1, s: '−0.3%' },
  { n: 'الذهب عيار 21 · عمّان', v: '61.40 د', d: 1, s: '+0.9%' }, { n: 'مؤشر بورصة عمّان', v: '2,614', d: 1, s: '+0.42%' },
  { n: 'بنزين 90 · هذا الشهر', v: '0.885 د/ل', d: -1, s: '−15 فلس' }, { n: 'التضخم · آب', v: '2.1%', d: 1, s: '+0.2' },
];

/* ---------------- alerts ---------------- */
export const MET_ALERT: null | { level: string; title: string; text: string; closures: { n: string; off: boolean }[] } = {
  level: 'الدرجة الثالثة',
  title: 'تنبيه الأرصاد: منخفض جوي من الدرجة الثالثة يبدأ ليل الثلاثاء',
  text: 'أمطار غزيرة على شمال ووسط المملكة، وتحذير من تشكّل السيول في الأغوار والبادية. الثلوج محتملة فوق 1000 م فجر الأربعاء.',
  closures: [{ n: 'عجلون', off: true }, { n: 'جرش', off: true }, { n: 'الطفيلة', off: true }, { n: 'عمّان', off: false }, { n: 'إربد', off: false }, { n: 'الزرقاء', off: false }],
};

/* ---------------- crossings / roads / services ---------------- */
export const CROSSINGS = [
  { n: 'جسر الملك حسين', st: 'ok', s: 'مفتوح · الخروج والدخول', w: 'انتظار ~40 د' }, { n: 'معبر جابر (سوريا)', st: 'ok', s: 'مفتوح', w: 'انتظار ~15 د' },
  { n: 'العمري (السعودية)', st: 'warn', s: 'ازدحام شاحنات', w: 'انتظار ~2 س' }, { n: 'وادي عربة', st: 'ok', s: 'مفتوح حتى 8 م', w: '—' },
  { n: 'مطار الملكة علياء', st: 'ok', s: '94% من الرحلات في وقتها', w: '38 مغادرة' },
];
export const ROADS = [
  { n: 'نفق الدوار الرابع', st: 'bad', s: 'إغلاق كلي للصيانة حتى 6 ص' }, { n: 'طريق المطار — اتجاه عمّان', st: 'warn', s: 'ازدحام شديد قرب جسر المطار' },
  { n: 'شارع الملكة رانيا', st: 'warn', s: 'حادث سير — تحويل مروري' }, { n: 'طريق إربد – عمّان', st: 'ok', s: 'انسيابية' }, { n: 'الدوار السابع', st: 'warn', s: 'كثافة عالية' },
];
export const SERVICES = [
  { k: 'مياه', c: '#0277bd', n: 'انقطاع مياه: عين الباشا وصافوط', s: 'الثلاثاء 8 ص – 6 م' }, { k: 'كهرباء', c: '#c98a00', n: 'صيانة مبرمجة: الجبيهة وشفا بدران', s: 'الأربعاء 9 – 1 ظهراً' },
  { k: 'رواتب', c: '#1b5e20', n: 'صرف رواتب الموظفين والمتقاعدين', s: 'الخميس 26 أيلول' }, { k: 'عطلة', c: '#6a1b9a', n: 'العطلة الرسمية القادمة: المولد النبوي', s: 'الجمعة 3 تشرين الأول' },
  { k: 'ضمان', c: '#4e342e', n: 'آخر موعد لطلبات التقاعد المبكر', s: '30 أيلول' },
];

/* ---------------- state ---------------- */
export const ROYAL = [
  { k: 'جلالة الملك', t: 'الملك يلتقي رئيس وزراء اليابان ويبحث تعزيز التعاون الاقتصادي والاستثمار في الطاقة', img: 'https://picsum.photos/id/500/500/350' },
  { k: 'ولي العهد', t: 'ولي العهد يطلع على مشروع «الأردن الرقمي» ويلتقي روّاد أعمال شباباً في الزرقاء', img: 'https://picsum.photos/id/3/500/350' },
  { k: 'الديوان الملكي', t: 'إرادة ملكية بالموافقة على تعيين أعضاء في مجلس الأعيان', img: 'https://picsum.photos/id/409/500/350' },
];
export const DECISIONS = [
  { k: 'تعيين', c: '#1b5e20', t: 'تعيين الدكتور فادي المجالي أميناً عاماً لوزارة الاقتصاد الرقمي' }, { k: 'إحالة', c: '#4e342e', t: 'إحالة 14 موظفاً في الفئة العليا على التقاعد' },
  { k: 'نظام', c: '#0d47a1', t: 'إقرار نظام معدّل لنظام الخدمة المدنية — ربط العلاوة بالأداء' }, { k: 'عطاء', c: '#c98a00', t: 'الموافقة على إحالة عطاء الباص السريع إربد – عمّان' },
  { k: 'اتفاقية', c: '#6a1b9a', t: 'اتفاقية منحة أوروبية بقيمة 60 مليون يورو لقطاع المياه' },
];
export const VOTE = {
  bill: 'مشروع قانون معدّل لقانون الضريبة العامة على المبيعات — القراءة الثانية', date: 'الثلاثاء 15 أيلول', yes: 78, no: 31, abs: 12,
  mps: [
    { n: 'م. أحمد الرقب', d: 'الدائرة الثالثة — عمّان', p: 'حزب الميثاق', v: 'مع', face: 11 }, { n: 'د. رانيا العبادي', d: 'إربد الأولى', p: 'حزب إرادة', v: 'ضد', face: 25 },
    { n: 'خالد الزعبي', d: 'الزرقاء الثانية', p: 'مستقل', v: 'مع', face: 33 }, { n: 'سهى المجالي', d: 'الكرك', p: 'حزب تقدم', v: 'غياب', face: 44 },
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
export const MATCH = { home: 'النشامى', away: 'السعودية', at: '2026-09-24T21:00:00+03:00', venue: 'استاد عمّان الدولي', comp: 'تصفيات كأس العالم' };
export const LEAGUE = [['الحسين إربد', 6, 16], ['الفيصلي', 6, 14], ['الوحدات', 6, 13], ['الرمثا', 6, 10], ['شباب الأردن', 6, 9]] as [string, number, number][];
export const FX = [['ريال سعودي → دينار', '0.189'], ['درهم إماراتي → دينار', '0.193'], ['ريال قطري → دينار', '0.195'], ['دينار كويتي → دينار', '2.31'], ['تحويل 1000 ريال · أفضل سعر اليوم', '189.4 د']];
export const CLOCKS = [['عمّان', 'Asia/Amman'], ['الرياض', 'Asia/Riyadh'], ['دبي', 'Asia/Dubai'], ['الدوحة', 'Asia/Qatar'], ['نيويورك', 'America/New_York']];
export const GULF_TZ = ['Asia/Riyadh', 'Asia/Dubai', 'Asia/Qatar', 'Asia/Kuwait', 'Asia/Bahrain', 'Asia/Muscat'];

/* ---------------- community ---------------- */
export const UGC = [
  { img: 'https://picsum.photos/id/397/600/400', loc: 'جبل اللويبدة', ago: 'منذ 25 دقيقة', t: '«حفرة مفتوحة منذ أسبوع دون تحويط أمام مدرسة» — أرسلها قارئ عبر واتساب المتابع، وتمّت مراجعتها تحريرياً.' },
  { img: 'https://picsum.photos/id/1067/600/400', loc: 'طريق المطار', ago: 'منذ ساعة', t: 'ازدحام خانق بعد حادث تصادم بين شاحنة وسيارتين قرب جسر المطار — لا إصابات.' },
];
export const GREETINGS = [
  { k: 'نجاح', c: '#1b5e20', t: 'ألف مبروك للدكتور عمر الطراونة حصوله على درجة الدكتوراه من جامعة مانشستر' }, { k: 'زفاف', c: '#ad1457', t: 'تهانينا لآل الزعبي وآل المجالي بمناسبة الزفاف الميمون' },
  { k: 'تخرج', c: '#0d47a1', t: 'مبروك لسارة الحياري تخرجها من كلية الطب — الجامعة الأردنية' }, { k: 'مولود', c: '#c98a00', t: 'الحمد لله على سلامة أم يوسف — عائلة الخصاونة' },
];
export const MEMORY = { date: '17 أيلول 1970', t: 'افتتاح أول محطة تلفزيونية أردنية بالبث الملوّن من جبل عمّان', p: 'كانت الثالثة عربياً في البث الملوّن. صور أرشيفية وشهادات من العاملين الأوائل في المحطة.', img: 'https://picsum.photos/id/409/600/400' };

/* ---------------- obituaries ---------------- */
export const OBITS = [
  { n: 'الحاج محمد عبدالله الخلايلة', a: 'صويلح', h: '4–8 مساءً', gov: 'عمّان' }, { n: 'الشيخ عوض سالم المجالي', a: 'الكرك — المزار', h: '3–7 مساءً', gov: 'الكرك' },
  { n: 'الحاجة فاطمة أحمد الزعبي', a: 'إربد — الحصن', h: '3–7 مساءً', gov: 'إربد' }, { n: 'المهندس سامر خليل الطراونة', a: 'الكرك', h: '4–8 مساءً', gov: 'الكرك' },
  { n: 'الدكتور يوسف محمود العبادي', a: 'عمّان — خلدا', h: '5–9 مساءً', gov: 'عمّان' },
];

/* ---------------- jobs ---------------- */
export const JOBS = [
  { t: 'ديوان الخدمة المدنية: 240 وظيفة تعليمية', s: 'وزارة التربية', urgent: true, d: 'ينتهي خلال 3 أيام' }, { t: 'عطاء توريد أجهزة طبية — مستشفى البشير', s: 'دائرة العطاءات', urgent: false, d: '12 يوماً' },
  { t: 'مهندس شبكات — شركة اتصالات', s: 'عمّان · دوام كامل', urgent: false, d: '9 أيام' }, { t: 'عطاء صيانة طرق — محافظة إربد', s: 'الأشغال العامة', urgent: true, d: 'ينتهي غداً' },
  { t: 'محاسب رئيسي — بنك محلي', s: 'عمّان', urgent: false, d: '20 يوماً' },
];

/* ---------------- fact-check / sixty / debate ---------------- */
export const FACTS = [
  { c: '«الحكومة سترفع أسعار الكهرباء 20% الشهر المقبل»', v: 'خاطئ', col: '#c62828' }, { c: '«الأردن ثاني أفقر دولة عربية في المياه»', v: 'صحيح', col: '#1b5e20' },
  { c: '«امتحان التوجيهي سيُلغى العام المقبل»', v: 'مضلّل', col: '#c98a00' },
];
export const SIXTY = [
  { k: 'ماذا حدث', b: 'الحكومة أقرّت تعديلات على قانون ضريبة المبيعات', p: 'تخفيض الضريبة على 12 سلعة أساسية من 16% إلى 8% ابتداءً من تشرين الأول.' },
  { k: 'لماذا يهم', b: 'أثر مباشر على فاتورة كل بيت', p: 'التقديرات الأولية: توفير 8–12 ديناراً شهرياً للأسرة المتوسطة، وضغط على إيرادات الخزينة بنحو 90 مليون دينار.' },
  { k: 'ما التالي', b: 'التصويت في مجلس النواب الأسبوع المقبل', p: 'اللجنة المالية تبدأ مناقشة التعديلات الأحد، ويتوقع تمريرها قبل إقرار الموازنة.' },
];
export const DEBATE = {
  q: 'هل يخدم رفع سعر الفائدة الاقتصاد الأردني؟',
  a: { name: 'م. ليلى العبادي', face: 1, pos: 'نعم، يحمي الدينار', col: '#1b5e20', p: 'الربط بالدولار يفرض علينا مجاراة الفيدرالي، والبديل هروب الودائع وضغط على الاحتياطي.' },
  b: { name: 'خالد الرواشدة', face: 4, pos: 'لا، يخنق الاستثمار', col: '#c62828', p: 'كلفة الاقتراض على الشركات الصغيرة تجاوزت 11%، وهذا يجمّد التوسع والتوظيف.' },
};

/* ---------------- exclusive article pools (B1) ---------------- */
export class Pool {
  private i = 0;
  constructor(private list: Article[]) {}
  take(n: number): Article[] {
    const out: Article[] = [];
    for (let k = 0; k < n && this.list.length; k++) out.push(this.list[(this.i++) % this.list.length]);
    return out;
  }
  /** Articles not yet handed out (used for “آخر الأنباء” so the fold never repeats). */
  rest(n: number) { return this.take(n); }
}
