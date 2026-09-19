'use client';

import { useEffect, useMemo, useState } from 'react';
import { Article, Ico, ago, face, Img } from '../site';
import { CROSSINGS, ROADS, SERVICES, ROYAL, DECISIONS, VOTE, TAWJIHI, ELECTIONS, MATCH, LEAGUE, FX, CLOCKS, GULF_TZ, UGC, GREETINGS, MEMORY, JOBS, FACTS, prayerTimes, Season } from '../feeds';
import { LIVE, fmtTime } from '../content';

/* ---------- J3 / J4 / J5 ---------- */
export function Crossings() {
  return (
    <ul className="st">
      {CROSSINGS.map((c) => <li key={c.n}><span className={`dot ${c.st}`} aria-hidden /><b>{c.n}</b><small>{c.s}</small><span className="pillx">{c.w}</span></li>)}
    </ul>
  );
}
export function Roads() {
  return (
    <>
      <ul className="st">{ROADS.map((r) => <li key={r.n}><span className={`dot ${r.st}`} aria-hidden /><b>{r.n}</b><small>{r.s}</small></li>)}</ul>
      <small className="src">المصدر: إدارة السير · آخر تحديث منذ 4 دقائق</small>
    </>
  );
}
export function Services() {
  return (
    <ul className="st">{SERVICES.map((s) => <li key={s.n}><span className="pillx" style={{ background: s.c, color: '#fff' }}>{s.k}</span><b>{s.n}</b><small>{s.s}</small></li>)}</ul>
  );
}

/* ---------- J6 royal strip ---------- */
export function Royal() {
  return (
    <div className="royal">
      {ROYAL.map((r) => <a key={r.k} href="/category/politics"><div className="im"><Img src={r.img} /></div><div className="t"><small>{r.k}</small>{r.t}</div></a>)}
    </div>
  );
}

/* ---------- J7 decisions ---------- */
export function Decisions() {
  return <ul className="dec">{DECISIONS.map((d) => <li key={d.t}><span className="k" style={{ background: d.c }}>{d.k}</span><a href="/category/politics">{d.t}</a></li>)}</ul>;
}

/* ---------- J8 how did your MP vote ---------- */
export function VoteTracker() {
  const [q, setQ] = useState('');
  const total = VOTE.yes + VOTE.no + VOTE.abs;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  const mps = VOTE.mps.filter((m) => !q || m.n.includes(q) || m.d.includes(q) || m.p.includes(q));
  return (
    <div className="vote">
      <div className="bill">{VOTE.bill}</div>
      <div className="bar" aria-label={`مع ${VOTE.yes} · ضد ${VOTE.no} · غياب ${VOTE.abs}`}><span style={{ width: pct(VOTE.yes) }}>{VOTE.yes} مع</span><span style={{ width: pct(VOTE.no) }}>{VOTE.no} ضد</span><span style={{ width: pct(VOTE.abs) }}>{VOTE.abs}</span></div>
      <div className="leg"><span className="y">■ مع {VOTE.yes}</span><span className="n">■ ضد {VOTE.no}</span><span className="a">■ غياب/امتناع {VOTE.abs}</span><span className="d">{VOTE.date}</span></div>
      <form className="srch" onSubmit={(e) => e.preventDefault()}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن نائب دائرتك بالاسم أو المنطقة أو الحزب…" aria-label="بحث عن نائب" /><button type="submit">بحث</button></form>
      <ul className="mps">
        {mps.slice(0, 3).map((m) => <li key={m.n} className="mp"><img src={face(m.face)} alt="" /><div><b>{m.n}</b><small>{m.d} · {m.p}</small></div><span className={`v ${m.v === 'مع' ? 'y' : m.v === 'ضد' ? 'n' : 'a'}`}>صوّت: {m.v}</span></li>)}
        {!mps.length && <li className="none">لا نتائج — جرّب اسم الدائرة</li>}
      </ul>
    </div>
  );
}

/* ---------- J9–J12 calculators (تقديرية) ---------- */
const jd = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })} د`;
function Field({ label, value, onChange, type = 'number', options }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; options?: string[] }) {
  return (
    <label className="f"><span>{label}</span>
      {options ? <select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select>
        : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" />}
    </label>
  );
}
export function TaxCalc() {
  const [sal, setSal] = useState('900'); const [st, setSt] = useState('متزوج');
  const yearly = (parseFloat(sal) || 0) * 12;
  const exempt = st === 'متزوج' ? 18000 + 1000 : 9000 + 1000; // personal + family exemptions + health/education allowance (approx.)
  let taxable = Math.max(0, yearly - exempt), tax = 0;
  for (const [cap, rate] of [[5000, 0.05], [5000, 0.1], [5000, 0.15], [5000, 0.2], [Infinity, 0.25]] as [number, number][]) { const x = Math.min(taxable, cap); tax += x * rate; taxable -= x; if (taxable <= 0) break; }
  return (
    <div className="tool"><b>حاسبة ضريبة الدخل</b>
      <Field label="الراتب الشهري (د)" value={sal} onChange={setSal} /><Field label="الحالة" value={st} onChange={setSt} options={['متزوج', 'أعزب']} />
      <div className="res">ضريبتك السنوية التقديرية<b>{jd(tax)}</b><small>{tax === 0 ? `إعفاء ${exempt.toLocaleString('en-US')} د — أنت تحت الحد` : `${jd(tax / 12)} شهرياً · حسب شرائح قانون 2019`}</small></div>
    </div>
  );
}
export function CustomsCalc() {
  const [val, setVal] = useState('14000'); const [type, setType] = useState('هايبرد'); const [cc, setCc] = useState('1.8');
  const v = parseFloat(val) || 0, c = parseFloat(cc) || 0;
  const special = type === 'كهربائي' ? 0.1 : type === 'هايبرد' ? 0.1 : c <= 1.5 ? 0.25 : c <= 2 ? 0.55 : 0.75; // approximate special tax bands
  const sales = 0.16;
  const total = v * special + (v + v * special) * sales;
  return (
    <div className="tool"><b>حاسبة جمارك السيارات</b>
      <Field label="القيمة (د)" value={val} onChange={setVal} /><div className="f2"><Field label="النوع" value={type} onChange={setType} options={['هايبرد', 'بنزين', 'كهربائي']} /><Field label="سعة المحرك (لتر)" value={cc} onChange={setCc} /></div>
      <div className="res">الرسوم والضرائب التقديرية<b>{jd(total)}</b><small>خاصة {Math.round(special * 100)}% + مبيعات 16% · تقديري وفق قرارات 2026</small></div>
    </div>
  );
}
export function ElecCalc() {
  const [kwh, setKwh] = useState('620');
  const k = parseFloat(kwh) || 0;
  const tiers: [number, number][] = [[160, 0.05], [140, 0.1], [200, 0.12], [100, 0.16], [Infinity, 0.2]];
  let rem = k, cost = 0, tier = 0;
  for (const [cap, rate] of tiers) { const x = Math.min(rem, cap); cost += x * rate; rem -= x; tier++; if (rem <= 0) break; }
  return (
    <div className="tool"><b>حاسبة فاتورة الكهرباء</b>
      <Field label="الاستهلاك الشهري (ك.و.س)" value={kwh} onChange={setKwh} /><div className="hint">التعرفة المنزلية · الشرائح التصاعدية</div>
      <div className="res">فاتورتك التقديرية<b>{jd(cost)}</b><small>أنت في الشريحة {tier} · تقديري بدون رسوم ثابتة</small></div>
    </div>
  );
}
export function AdmissionCalc() {
  const [avg, setAvg] = useState('87.4'); const [br, setBr] = useState('علمي');
  const a = parseFloat(avg) || 0;
  const majors: [string, number, string][] = [['الطب — الأردنية', 97.8, 'علمي'], ['طب الأسنان — الأردنية', 96.5, 'علمي'], ['الهندسة الكهربائية — العلوم والتكنولوجيا', 89.2, 'علمي'], ['الهندسة المدنية — اليرموك', 86.1, 'علمي'], ['علم الحاسوب — الأردنية', 84.3, 'علمي'], ['التمريض — الهاشمية', 80.5, 'علمي'], ['القانون — الأردنية', 85.9, 'أدبي'], ['إدارة الأعمال — اليرموك', 78.2, 'أدبي'], ['اللغة الإنجليزية — مؤتة', 74.6, 'أدبي'], ['الصحافة — اليرموك', 72.1, 'أدبي']];
  const ok = majors.filter((m) => (m[2] === br || br === 'علمي') && m[1] <= a);
  return (
    <div className="tool"><b>معدلك والقبول الموحد</b>
      <div className="f2"><Field label="معدل التوجيهي" value={avg} onChange={setAvg} /><Field label="الفرع" value={br} onChange={setBr} options={['علمي', 'أدبي']} /></div>
      <div className="res">تخصصات ضمن معدلك<b>{ok.length} تخصصاً</b><small>{ok[0] ? `${ok[0][0]}: ${ok[0][1]} آخر عام` : 'ارفع المعدل أو غيّر الفرع'}</small></div>
    </div>
  );
}

/* ---------- countdown helper ---------- */
function useCountdown(iso: string) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => { const f = () => setLeft(Math.max(0, new Date(iso).getTime() - Date.now())); f(); const t = setInterval(f, 1000); return () => clearInterval(t); }, [iso]);
  if (left === null) return null;
  const d = Math.floor(left / 86400e3), h = Math.floor((left % 86400e3) / 3600e3), m = Math.floor((left % 3600e3) / 60e3), s = Math.floor((left % 60e3) / 1000);
  return { d, h, m, s };
}
const Cnt = ({ iso, days = true }: { iso: string; days?: boolean }) => {
  const c = useCountdown(iso);
  if (!c) return <div className="cnt" aria-hidden><span>--</span><span>--</span><span>--</span></div>;
  return (
    <div className="cnt">
      {days && <span>{c.d}<small>يوم</small></span>}
      <span>{String(c.h).padStart(2, '0')}<small>ساعة</small></span>
      <span>{String(c.m).padStart(2, '0')}<small>دقيقة</small></span>
      {!days && <span>{String(c.s).padStart(2, '0')}<small>ثانية</small></span>}
    </div>
  );
};

/* ---------- J13–J15 seasonal (in season, or ?season=all for preview) ---------- */
export function Seasonal({ season }: { season: Season | 'all' }) {
  const show = (s: Season) => season === 'all' || season === s;
  if (!season) return null;
  const pr = prayerTimes();
  const today = new Date(); const mag = pr.find((p) => p.k === 'maghrib')!;
  const iftar = new Date(today); iftar.setHours(Math.floor(mag.h), Math.round((mag.h % 1) * 60), 0, 0);
  if (iftar.getTime() < Date.now()) iftar.setDate(iftar.getDate() + 1);
  return (
    <div className="three seasons">
      {show('tawjihi') && (
        <div className="sec season"><div className="hd"><b>موسم التوجيهي</b><i /><span className="meta">كتلة موسمية · تموز/آب</span></div>
          <div className="tawj"><small className="lbl2">النتائج بعد</small><Cnt iso={TAWJIHI.resultsAt} />
            <form className="srch" onSubmit={(e) => e.preventDefault()}><input placeholder="رقم الجلوس — النتيجة هنا لحظة صدورها" aria-label="رقم الجلوس" /><button type="submit">استعلام</button></form>
            <p className="top">{TAWJIHI.topline}</p></div></div>
      )}
      {show('ramadan') && (
        <div className="sec season"><div className="hd"><b>رمضان — إمساكية اليوم</b><i /><span className="meta">عمّان · {hijriLabel()}</span></div>
          <div className="ims"><div className="big">الإفطار بعد<Cnt iso={iftar.toISOString()} days={false} /><small>المغرب {mag.t} — عمّان</small></div>
            {pr.filter((p) => ['fajr', 'dhuhr', 'asr', 'isha'].includes(p.k)).map((p) => <span key={p.k}>{p.k === 'fajr' ? 'الإمساك/الفجر' : p.n}<b>{p.t}</b></span>)}</div>
          <p className="top">إمساكية المحافظات · دعاء اليوم · مواعيد الدوام الرمضاني · برامج المتابع الرمضانية</p></div>
      )}
      {show('elections') && (
        <div className="sec season"><div className="hd"><b>الانتخابات النيابية — النتائج</b><i /><span className="meta">ليلة الفرز · مباشر</span></div>
          <div className="elec"><div className="map">خريطة الأردن — النتائج بالدوائر الانتخابية (18 دائرة + القوائم العامة)</div>
            <ul>{ELECTIONS.map((e) => <li key={e.n}><span>{e.n}</span><b>{e.v}</b></li>)}</ul></div></div>
      )}
    </div>
  );
}
const hijriLabel = () => { try { return new Intl.DateTimeFormat('ar-JO-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long' }).format(new Date()); } catch { return ''; } };

/* ---------- J16 sports ---------- */
export function Sports() {
  return (
    <>
      <div className="match">
        <div className="tm2"><i aria-hidden /> {MATCH.home}</div>
        <div className="mid2">{MATCH.comp}<Cnt iso={MATCH.at} /><small>{MATCH.venue} · {new Intl.DateTimeFormat('ar-JO-u-nu-latn', { weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman' }).format(new Date(MATCH.at))}</small></div>
        <div className="tm2"><i aria-hidden /> {MATCH.away}</div>
      </div>
      <table className="tbl"><thead><tr><th>#</th><th>دوري المحترفين</th><th>ل</th><th>ن</th></tr></thead>
        <tbody>{LEAGUE.map(([t, p, n], i) => <tr key={t}><td className="num">{i + 1}</td><td>{t}</td><td className="num">{p}</td><td className="num">{n}</td></tr>)}</tbody></table>
    </>
  );
}

/* ---------- J17 diaspora (auto-emphasised for Gulf time zones) ---------- */
export function Diaspora() {
  const [now, setNow] = useState<Date | null>(null);
  const [gulf, setGulf] = useState(false);
  useEffect(() => {
    setNow(new Date()); const t = setInterval(() => setNow(new Date()), 30000);
    try { setGulf(GULF_TZ.includes(Intl.DateTimeFormat().resolvedOptions().timeZone)); } catch {}
    return () => clearInterval(t);
  }, []);
  return (
    <div className={`dia ${gulf ? 'gulf' : ''}`}>
      {gulf && <div className="hi">أهلاً بك من الخليج — هذه الكتلة مخصصة لك</div>}
      <div className="clocks">{CLOCKS.map(([n, tz]) => <span key={tz}>{n}<b>{now ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(now) : '--:--'}</b></span>)}</div>
      <ul className="fx">{FX.map(([a, b]) => <li key={a}><span>{a}</span><b>{b}</b></li>)}</ul>
      <p className="note"><b>يهم المغترب:</b> إعفاء جمركي للعائدين · مواعيد السفارة في الرياض · رحلات عمّان–الدمام من 120 د</p>
    </div>
  );
}

/* ---------- J18 / J19 / J20 community ---------- */
export function Ugc() {
  const u = UGC[0];
  return (
    <div className="ugc">
      <div className="ph"><Img src={u.img} /><span>{u.loc} — {u.ago}</span></div>
      <p>{u.t}</p>
      <a className="send" href="https://wa.me/962790000000?text=%D8%AE%D8%A8%D8%B1%20%D9%84%D9%84%D9%85%D8%AA%D8%A7%D8%A8%D8%B9" target="_blank" rel="noopener">{Ico.wa}أرسل صورتك أو خبرك</a>
    </div>
  );
}
export function Greetings() {
  const [list, setList] = useState(GREETINGS);
  const [open, setOpen] = useState(false); const [txt, setTxt] = useState(''); const [kind, setKind] = useState('نجاح');
  const add = () => { if (!txt.trim()) return; setList([{ k: kind, c: GREETINGS.find((g) => g.k === kind)?.c || '#1b5e20', t: txt.trim() }, ...list]); setTxt(''); setOpen(false); };
  return (
    <div className="greet">
      <ul>{list.slice(0, 4).map((g, i) => <li key={i}><span className="k" style={{ background: g.c }}>{g.k}</span>{g.t}</li>)}</ul>
      {open ? (
        <form className="addf" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="نوع التهنئة">{['نجاح', 'زفاف', 'تخرج', 'مولود'].map((k) => <option key={k}>{k}</option>)}</select>
          <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="نص التهنئة…" aria-label="نص التهنئة" />
          <button type="submit">نشر (5 د)</button>
        </form>
      ) : <button type="button" className="add" onClick={() => setOpen(true)}>أضف تهنئتك — 5 دنانير · تظهر خلال ساعة</button>}
    </div>
  );
}
export function Memory() {
  return (
    <div className="mem">
      <div className="ph"><Img src={MEMORY.img} /></div>
      <b>في مثل هذا اليوم · {MEMORY.date}</b><small>ذاكرة الأردن</small>
      <p><strong>{MEMORY.t}.</strong> {MEMORY.p}</p>
    </div>
  );
}

/* ---------- C7 capture ---------- */
export function Capture() {
  const [done, setDone] = useState(false);
  return (
    <div className="cap-card">
      <b>تابع المتابع أينما كنت</b>
      <p>الأخبار العاجلة على هاتفك لحظة وقوعها — بلا إعلانات وبلا خوارزميات.</p>
      <div className="btns"><a className="wa" href="https://whatsapp.com/channel/mutabe3" target="_blank" rel="noopener">{Ico.wa}قناة واتساب</a><a className="tg" href="https://t.me/mutabe3" target="_blank" rel="noopener">{Ico.tg}تيليغرام</a></div>
      {done ? <div className="ok">تم! ستصلك النشرة الصباحية غداً 7:00.</div> : (
        <form className="em" onSubmit={(e) => { e.preventDefault(); setDone(true); }}><input type="email" required placeholder="بريدك الإلكتروني للنشرة الصباحية" aria-label="البريد الإلكتروني" /><button type="submit">اشترك</button></form>
      )}
      <small>يتابعنا 48,200 مشترك · إلغاء الاشتراك بضغطة واحدة</small>
    </div>
  );
}

/* ---------- C14 fact-check ---------- */
export function FactCheck() {
  return <div className="fact">{FACTS.map((f) => <a className="c" key={f.c} href="/tag/%D8%A7%D9%84%D8%AD%D9%83%D9%88%D9%85%D8%A9"><small>الادعاء</small><b>{f.c}</b><span className="v" style={{ background: f.col }}>{f.v}</span></a>)}</div>;
}

/* ---------- C10 jobs ---------- */
export function Jobs() {
  return <ul className="jobs">{JOBS.map((j) => <li key={j.t}><b>{j.t}</b><small>{j.s}</small><span className={`dl ${j.urgent ? '' : 'ok'}`}>{j.d}</span></li>)}</ul>;
}

/* ---------- C8 story timeline (from LIVE data) ---------- */
export function Timeline({ id = 'art-006', title = 'الاجتماع العربي في عمّان' }: { id?: string; title?: string }) {
  const e = LIVE[id];
  if (!e) return null;
  return (
    <div className="tl">
      <a className="h" href={`/article/${id}`}>تطور القصة: {title} ›</a>
      <ul>{e.slice(0, 4).map((x, i) => <li key={i}><time suppressHydrationWarning>{fmtTime(x.at)}</time><span>{x.title || x.text}</span></li>)}</ul>
    </div>
  );
}

/* ---------- C9 audio bulletin (Web Speech API; server TTS later) ---------- */
export function AudioPill({ articles, mini = false }: { articles: Article[]; mini?: boolean }) {
  const [state, setState] = useState<'idle' | 'playing' | 'unsupported'>('idle');
  const [idx, setIdx] = useState(0);
  const heads = useMemo(() => articles.slice(0, 5).map((a) => a.title), [articles]);
  useEffect(() => { if (typeof window !== 'undefined' && !('speechSynthesis' in window)) setState('unsupported'); }, []);
  const stop = () => { window.speechSynthesis?.cancel(); setState('idle'); setIdx(0); };
  const play = () => {
    if (state === 'playing') return stop();
    const ss = window.speechSynthesis; if (!ss) return;
    ss.cancel();
    const voice = ss.getVoices().find((v) => v.lang.startsWith('ar'));
    const intro = new SpeechSynthesisUtterance('نشرة المتابع الصوتية. أبرز خمسة أخبار.'); intro.lang = 'ar-JO'; if (voice) intro.voice = voice;
    ss.speak(intro);
    heads.forEach((h, i) => { const u = new SpeechSynthesisUtterance(`الخبر ${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'][i]}. ${h}`); u.lang = 'ar-JO'; if (voice) u.voice = voice; u.onstart = () => setIdx(i); if (i === heads.length - 1) u.onend = () => setState('idle'); ss.speak(u); });
    setState('playing');
  };
  if (state === 'unsupported') return null;
  if (mini) {
    return (
      <div className={`mini ${state === 'playing' ? 'on' : ''}`}>
        <button type="button" className="pb" onClick={play} aria-label={state === 'playing' ? 'إيقاف' : 'تشغيل النشرة'}>{state === 'playing' ? '❚❚' : Ico.play}</button>
        <span><b>نشرة المتابع الصوتية</b><small>{state === 'playing' ? `الخبر ${idx + 1} من ${heads.length}` : `أبرز ${heads.length} أخبار · ~3 دقائق`}</small></span>
        <span className="prog"><i style={{ width: state === 'playing' ? `${((idx + 1) / heads.length) * 100}%` : 0 }} /></span>
      </div>
    );
  }
  return (
    <button type="button" className={`pill audio ${state === 'playing' ? 'on' : ''}`} onClick={play} title="نشرة صوتية بأبرز الأخبار">
      {state === 'playing' ? '❚❚' : Ico.play}<span>{state === 'playing' ? `يُقرأ الخبر ${idx + 1}/${heads.length}` : 'استمع للنشرة'}</span>{state !== 'playing' && <small>3:10</small>}
    </button>
  );
}

