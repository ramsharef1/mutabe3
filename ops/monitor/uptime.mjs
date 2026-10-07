// Uptime probe (D-059), run every 10 minutes from a GitHub runner: the homepage must answer 200 with the
// site name in it, /api/health must answer 200 "healthy" (which includes a database round-trip).
// A failure is confirmed by a second pass one minute later, ignored while a deploy is running, and then
// opens the «alert:uptime» issue (→ email). The next green pass closes it with the outage duration.
// Exit code 1 only on the pass that opens the issue, so the Actions list shows one red run per incident.
//   MONITOR_BASE   probe another origin (default https://mutabe3.news)
//   MONITOR_DRILL  =1 treats every probe as failed — exercises the whole alert path; run again without it to see the recovery
import { raise, resolve, deployInProgress, summary, sleep } from './lib.mjs';

const BASE = (process.env.MONITOR_BASE || 'https://mutabe3.news').replace(/\/$/, '');
const DRILL = process.env.MONITOR_DRILL === '1';
const TIMEOUT_MS = 20_000;

const CHECKS = [
  { name: 'الصفحة الرئيسية', url: `${BASE}/`, ok: (r, t) => r.status === 200 && t.includes('المتابع') },
  { name: '`/api/health`', url: `${BASE}/api/health`, ok: (r, t) => r.status === 200 && /"status":"healthy"/.test(t) },
];

async function probe(c) {
  const t0 = Date.now();
  try {
    const r = await fetch(c.url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'mutabe3-monitor/1 (+https://github.com/ramsharef1/mutabe3)', 'cache-control': 'no-cache' },
    });
    const text = await r.text();
    const ms = Date.now() - t0;
    if (DRILL) return { ...c, ok: false, ms, detail: 'تجربة إنذار (drill) — الفحص الحقيقي نجح' };
    const ok = c.ok(r, text);
    const snippet = text.length < 300 ? ' · ' + text.replace(/\s+/g, ' ').slice(0, 120) : '';
    return { ...c, ok, ms, detail: ok ? '' : `HTTP ${r.status}${snippet}` };
  } catch (e) {
    const detail = e.name === 'TimeoutError' ? `انتهت المهلة (${TIMEOUT_MS / 1000} ث)` : e.cause?.code || e.cause?.message || e.message;
    return { ...c, ok: false, ms: Date.now() - t0, detail };
  }
}

const table = (rows) =>
  '| الفحص | النتيجة | الاستجابة |\n|---|---|---|\n' +
  rows.map((r) => `| ${r.name} | ${r.ok ? '✅' : '❌ ' + r.detail} | ${r.ms} ms |`).join('\n');

let results = await Promise.all(CHECKS.map(probe));
let failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.log(`first pass: ${failed.map((r) => r.name).join(', ')} failed — second pass in 60 s`);
  await sleep(60_000);
  results = await Promise.all(CHECKS.map(probe));
  failed = results.filter((r) => !r.ok);
}
summary(`### ${BASE} · ${new Date().toISOString()}\n${table(results)}`);

if (!failed.length) {
  await resolve('uptime', 'عاد الموقع للعمل');
  process.exit(0);
}
if (!DRILL && (await deployInProgress())) {
  console.log('a deploy is running — the restart window is expected, not alerting');
  process.exit(0);
}

const title = DRILL ? '🧪 تجربة إنذار: الموقع لا يستجيب (drill)' : '🔴 الموقع لا يستجيب — mutabe3.news';
const body =
  `فشل الفحص في مرّتين متتاليتين بفاصل دقيقة (${new Date().toISOString()}):\n\n${table(results)}\n\n` +
  'ما يُفحص: الصفحة الرئيسية (200 + اسم الموقع) و `/api/health` (200 + `healthy`، ويشمل اتصال قاعدة البيانات). ' +
  'يُعاد الفحص كل 10 دقائق ويُغلق هذا التنبيه تلقائياً عند التعافي.\n\n' +
  '**الخطوات (COMMANDS.md § Emergency):** `gh workflow run ops-vps.yml -f action=status` ثم، في وحدة تحكم hPanel، ' +
  '`systemctl status mutabe3-backend mutabe3-frontend nginx` و `journalctl -u mutabe3-backend -n 200`؛ ' +
  'إصدار سيّئ → revert على `main` فيعاد النشر.';
const { opened } = await raise('uptime', title, body, { recommentMin: 55 });
process.exit(opened ? 1 : 0);
