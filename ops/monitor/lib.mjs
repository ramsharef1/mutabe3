// Shared by the monitor scripts (D-059): GitHub REST over fetch, and "alert issues" — one open issue per
// alert category. Opening one emails whoever the body mentions (GitHub's own notifications, so no mail
// server and no DNS are needed); closing it emails the recovery. DRY_RUN=1 logs writes instead of sending them.
import fs from 'node:fs';

const API = process.env.GITHUB_API_URL || 'https://api.github.com';
const REPO = process.env.GITHUB_REPOSITORY || 'ramsharef1/mutabe3';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const RUN_URL = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : '';
export const DRY = process.env.DRY_RUN === '1';
export const MENTION = process.env.ALERT_MENTION || '';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function api(method, path, body) {
  if (DRY && method !== 'GET') {
    console.log(`[dry-run] ${method} ${path}${body ? ' ' + JSON.stringify(body).slice(0, 600) : ''}`);
    return { number: 0, html_url: '(dry-run)', ...(body || {}) };
  }
  if (!TOKEN) throw new Error('GH_TOKEN / GITHUB_TOKEN is not set');
  const r = await fetch(`${API}/repos/${REPO}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
      'user-agent': 'mutabe3-monitor',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 204) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path} → HTTP ${r.status} ${j.message || ''}`);
  return j;
}

const LABELS = {
  ops: ['6E7781', 'تشغيل: تنبيهات وتقارير آلية من monitor.yml'],
  alert: ['D73A4A', 'تنبيه مفتوح من المراقبة الآلية'],
  digest: ['0E8A16', 'التقرير الأسبوعي لصحة الخادم'],
  'alert:uptime': ['B60205', 'الموقع لا يستجيب'],
  'alert:backup': ['D93F0B', 'النسخ الاحتياطي'],
  'alert:disk': ['D93F0B', 'القرص'],
  'alert:service': ['B60205', 'خدمة متوقفة'],
  'alert:tls': ['FBCA04', 'شهادة TLS'],
  'alert:ssh': ['FBCA04', 'الفحص اليومي لم يصل إلى الخادم'],
};
const ensured = new Set();
export async function ensureLabels(names) {
  for (const name of names) {
    if (ensured.has(name)) continue;
    const [color, description] = LABELS[name] || ['EDEDED', ''];
    try {
      await api('POST', '/labels', { name, color, description });
    } catch (e) {
      if (!/HTTP 422/.test(e.message)) throw e; // already exists
    }
    ensured.add(name);
  }
}

export async function openIssue(label) {
  const list = await api('GET', `/issues?state=open&labels=${encodeURIComponent(label)}&per_page=5`);
  return (list || []).find((i) => !i.pull_request) || null;
}

// Arabic counted nouns (1 · 2 · 3–10 · 11+) with Western digits — easier to scan in a mail subject list.
export const count = (n, [one, two, few, many]) => {
  n = Math.round(Number(n));
  if (!Number.isFinite(n)) return `— ${many}`;
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
};
export const days = (n) => count(n, ['يوم واحد', 'يومان', 'أيام', 'يوماً']);
export const hours = (n) => count(n, ['ساعة واحدة', 'ساعتان', 'ساعات', 'ساعة']);
export const minutes = (n) => count(n, ['دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة']);

// "3 أيام و4 ساعات" / "ساعتان و15 دقيقة" / "7 دقائق"
export function since(iso) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return minutes(m);
  const h = Math.floor(m / 60);
  if (h < 48) return hours(h) + (m % 60 ? ' و' + minutes(m % 60) : '');
  return days(Math.floor(h / 24)) + (h % 24 ? ' و' + hours(h % 24) : '');
}

export const footer = () =>
  `\n\n---\n${MENTION ? MENTION + ' · ' : ''}تنبيه آلي من \`.github/workflows/monitor.yml\`${RUN_URL ? ` · [سجل التشغيل](${RUN_URL})` : ''}`;

// Open (or keep) the alert issue of a category. While it stays open, a reminder comment is added at most
// once per `recommentMin` minutes (hourly for the 10-minute uptime probe, daily for the daily server check).
export async function raise(category, title, body, { recommentMin = 55 } = {}) {
  const label = `alert:${category}`;
  await ensureLabels(['ops', 'alert', label]);
  const open = await openIssue(label);
  if (!open) {
    const issue = await api('POST', '/issues', { title, body: body + footer(), labels: ['ops', 'alert', label] });
    console.log(`🔴 opened #${issue.number} — ${title}`);
    return { opened: true, issue };
  }
  const quietMin = (Date.now() - new Date(open.updated_at).getTime()) / 60000;
  if (quietMin >= recommentMin) {
    await api('POST', `/issues/${open.number}/comments`, { body: `لا يزال قائماً منذ ${since(open.created_at)}.\n\n${body}` + footer() });
    console.log(`… reminder on #${open.number} (quiet for ${Math.round(quietMin)} min)`);
  } else {
    console.log(`… #${open.number} already open (updated ${Math.round(quietMin)} min ago)`);
  }
  return { opened: false, issue: open };
}

// Close the category's open issue with a recovery comment. Returns false when nothing was open.
export async function resolve(category, note) {
  const open = await openIssue(`alert:${category}`);
  if (!open) return false;
  await api('POST', `/issues/${open.number}/comments`, { body: `✅ ${note} — استمرّت الحالة ${since(open.created_at)}.` + footer() });
  await api('PATCH', `/issues/${open.number}`, { state: 'closed', state_reason: 'completed' });
  console.log(`✅ closed #${open.number} — ${note}`);
  return true;
}

// A deploy restarts both units; its own health poll covers that window, so the uptime probe stays quiet.
export async function deployInProgress() {
  try {
    const runs = await Promise.all(
      ['in_progress', 'queued'].map((status) => api('GET', `/actions/workflows/deploy-vps.yml/runs?status=${status}&per_page=3`)),
    );
    return runs.some((r) => (r?.workflow_runs || []).length > 0);
  } catch (e) {
    console.log(`(could not check deploy runs: ${e.message})`);
    return false;
  }
}

export function summary(md) {
  const f = process.env.GITHUB_STEP_SUMMARY;
  if (f) fs.appendFileSync(f, md + '\n');
  console.log(md);
}

export const today = () => new Date().toISOString().slice(0, 10);
