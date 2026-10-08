// Daily server check (D-059): reads the `key=value` facts ops/vps/healthcheck.sh printed on the VPS, applies
// the thresholds below and opens/closes one alert issue per category (backup, disk, service, tls, ssh).
// On Sundays (or WEEKLY=1) it also posts the weekly digest as a comment on the rolling «🩺» issue — the
// heartbeat: if the Sunday mail stops arriving, the schedule itself has stopped.
//   node ops/monitor/server.mjs facts.txt        env: SSH_OK=0|1  TLS_DAYS=<n>  WEEKLY=1  DRY_RUN=1
import fs from 'node:fs';
import { api, raise, resolve, openIssue, ensureLabels, footer, summary, today, days, hours, count } from './lib.mjs';

const T = { diskPct: 90, diskClearPct: 85, dumpAgeH: 30, dumpMinKb: 10, uploadsArchiveD: 10, tlsDays: 14 };
const DAILY = 20 * 60; // reminder cadence (minutes) for issues that stay open across daily runs

const file = process.argv[2] || process.env.REPORT_FILE || 'facts.txt';
const sshOk = process.env.SSH_OK !== '0';
const tlsDays = Number(process.env.TLS_DAYS);
const weekly = process.env.WEEKLY === '1' || (process.env.GITHUB_EVENT_NAME === 'schedule' && new Date().getUTCDay() === 0);

const f = {};
if (sshOk && fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([a-z0-9_]+)=(.*)$/i);
    if (m) f[m[1]] = m[2].trim();
  }
}
const has = Object.keys(f).length > 0;
const num = (k) => (Number.isFinite(Number(f[k])) && f[k] !== '' ? Number(f[k]) : NaN);
const v = (k, dash = '—') => (f[k] === undefined || f[k] === '' || f[k] === 'unknown' ? dash : f[k]);
const list = (lines) => lines.map((l) => `- ${l}`).join('\n');
let opened = false;
const track = (r) => { if (r?.opened) opened = true; };

// ── reachability of the daily check itself ───────────────────────────────────────────────────────────
// Since D-081 the facts are written hourly by a root timer on the VPS and only read over SSH by the
// read-only monitor user, so a stopped timer shows up as old facts rather than as an SSH failure.
const factsAgeH = has && f.now ? (Date.now() - Date.parse(f.now)) / 3_600_000 : NaN;
const stale = Number.isFinite(factsAgeH) && factsAgeH > 3;
if (!sshOk) {
  track(await raise('ssh', '⚠️ الفحص اليومي لم يصل إلى الخادم — mutabe3 VPS',
    'فشل اتصال SSH من GitHub Actions إلى الخادم، فلم يُفحص القرص ولا النسخ الاحتياطي ولا الخدمات اليوم. ' +
    'فحص الموقع من الخارج (كل 10 دقائق) مستقل عن هذا ويستمر.\n\n' +
    '**تحقّق:** هل الخادم يعمل (hPanel)؟ هل تغيّر منفذ SSH أو مفتاح المراقبة (`VPS_MONITOR_*` في أسرار بيئة production)؟ ' +
    'جرّب `gh workflow run ops-vps.yml -f action=status`.', { recommentMin: DAILY }));
} else if (stale) {
  track(await raise('ssh', `⚠️ بيانات الفحص اليومي قديمة (${Math.round(factsAgeH)} ساعة) — mutabe3 VPS`,
    `آخر بيانات كتبها الخادم تعود إلى ${f.now}؛ مؤقّت \`mutabe3-facts.timer\` متوقف على الأرجح، فالأرقام أدناه ليست حديثة.\n\n` +
    '**الخطوات:** `gh workflow run ops-vps.yml -f action=setup-monitor-user` يعيد تثبيت المؤقّت ويشغّله.', { recommentMin: DAILY }));
} else {
  await resolve('ssh', 'الفحص اليومي وصل إلى الخادم ببيانات حديثة');
}

if (has) {
  // ── disk ──────────────────────────────────────────────────────────────────────────────────────────
  const mounts = new Map();
  for (const k of ['root', 'uploads', 'backups']) {
    const m = f[`disk_${k}_mount`], p = num(`disk_${k}_pct`);
    if (m && Number.isFinite(p)) mounts.set(m, { pct: p, free: f[`disk_${k}_free_gb`] });
  }
  const inode = num('inode_root_pct');
  const worst = Math.max(0, ...[...mounts.values()].map((x) => x.pct), Number.isFinite(inode) ? inode : 0);
  const diskLines = [...mounts].filter(([, x]) => x.pct >= T.diskClearPct).map(([m, x]) => `\`${m}\`: ${x.pct}% مستخدم · ${x.free} GB حرّة`);
  if (inode >= T.diskClearPct) diskLines.push(`inodes على \`/\`: ${inode}%`);
  if (worst >= T.diskPct || (worst >= T.diskClearPct && (await openIssue('alert:disk')))) {
    track(await raise('disk', `⚠️ القرص يقترب من الامتلاء (${worst}%) — mutabe3 VPS`,
      `${list(diskLines)}\n\nيُغلق التنبيه تلقائياً عندما يعود الاستخدام تحت ${T.diskClearPct}%.\n\n` +
      '**ما يمكن تحريره بأمان (COMMANDS.md § Emergency):** مشتقات الصور `/var/www/mutabe3/uploads/.cache` (تُعاد توليدها)، ' +
      'النسخ الاحتياطية تدور وحدها (14 يومية / 6 أسبوعية). الخادم مشترك مع مواقع أخرى — افحص `du -xsh /var/* /home/* | sort -h` أولاً.',
      { recommentMin: DAILY }));
  } else if (worst < T.diskClearPct) {
    await resolve('disk', `القرص عاد تحت ${T.diskClearPct}% (${worst}% الآن)`);
  }

  // ── backups (D-048) ───────────────────────────────────────────────────────────────────────────────
  const bk = [];
  if (f.backup_timer !== 'active') bk.push(`مؤقّت \`mutabe3-backup.timer\` ليس فعّالاً (${v('backup_timer')})`);
  if (f.backup_last_result && !['success', 'unknown'].includes(f.backup_last_result)) bk.push(`آخر تشغيل للنسخ انتهى بـ \`${f.backup_last_result}\` (${v('backup_last_run')})`);
  if (f.dump_newest === 'none' || f.dump_newest === undefined) {
    bk.push('لا توجد أي نسخة قاعدة بيانات في `/var/backups/mutabe3`');
  } else {
    if (!(num('dump_age_h') <= T.dumpAgeH)) bk.push(`أحدث نسخة \`${f.dump_newest}\` عمرها ${hours(num('dump_age_h'))} (المتوقع أقل من ${T.dumpAgeH})`);
    if (f.dump_valid !== 'yes') bk.push(`أحدث نسخة \`${f.dump_newest}\` لا تمرّ فحص \`pg_restore --list\``);
    if (num('dump_size_kb') < T.dumpMinKb) bk.push(`حجم أحدث نسخة ${v('dump_size_kb')} KB — أصغر من المتوقع`);
  }
  if (f.uploads_archive_age_d !== 'none' && num('uploads_archive_age_d') > T.uploadsArchiveD) bk.push(`أرشيف الرفع الأسبوعي عمره ${days(num('uploads_archive_age_d'))} (يُؤخذ كل أحد)`);
  if (bk.length) {
    track(await raise('backup', '⚠️ النسخ الاحتياطي الليلي يحتاج انتباهاً — mutabe3 VPS',
      `${list(bk)}\n\n**الخطوات:** \`gh workflow run ops-vps.yml -f action=backup-now\` لنسخة فورية؛ ` +
      '`-f action=setup-backups` يعيد تسليح المؤقّت وينتهي بتمرين استعادة؛ في وحدة التحكم `journalctl -u mutabe3-backup -n 50`. ' +
      'النسخ الأسبوعية على مستوى الخادم (hPanel) مستقلة عن هذا.', { recommentMin: DAILY }));
  } else {
    await resolve('backup', 'النسخ الاحتياطي سليم');
  }

  // ── services ──────────────────────────────────────────────────────────────────────────────────────
  const svc = [];
  for (const [k, unit] of [['backend', 'mutabe3-backend'], ['frontend', 'mutabe3-frontend'], ['nginx', 'nginx'], ['postgres', 'postgresql']]) {
    const s = f[`unit_${k}`];
    if (s && s !== 'active' && s !== 'unknown') svc.push(`الوحدة \`${unit}\`: ${s}`);
  }
  if (f.health_backend && f.health_backend !== '200') svc.push(`\`/api/health\` محلياً: HTTP ${f.health_backend}`);
  if (f.health_frontend && f.health_frontend !== '200') svc.push(`الواجهة محلياً (:9100): HTTP ${f.health_frontend}`);
  if (svc.length) {
    track(await raise('service', '🔴 خدمة متوقفة على الخادم — mutabe3',
      `${list(svc)}\n\n**الخطوات:** \`gh workflow run ops-vps.yml -f action=status\`؛ في وحدة التحكم ` +
      '`systemctl status <الوحدة>` و `journalctl -u <الوحدة> -n 200`؛ إعادة نشر آخر إصدار سليم: `gh workflow run deploy-vps.yml`.',
      { recommentMin: DAILY }));
  } else {
    await resolve('service', 'كل الخدمات فعّالة');
  }
}

// ── TLS (measured from the runner, so it works even when SSH does not) ───────────────────────────────
if (Number.isFinite(tlsDays)) {
  if (tlsDays < T.tlsDays) {
    track(await raise('tls', `⚠️ شهادة TLS تنتهي بعد ${days(tlsDays)} — mutabe3.news`,
      'التجديد الآلي لم يحدث. **تحقّق في وحدة التحكم:** `certbot renew --dry-run` أو لوحة AdminBolt → SSL، ثم `nginx -t && systemctl reload nginx`.',
      { recommentMin: DAILY }));
  } else {
    await resolve('tls', `الشهادة جُدّدت (تنتهي بعد ${days(tlsDays)})`);
  }
}

// ── report table (always in the step summary; on Sundays also on the rolling digest issue) ───────────
let openAlerts = [], closedWeek = [];
try {
  openAlerts = (await api('GET', '/issues?state=open&labels=alert&per_page=20')) || [];
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  closedWeek = ((await api('GET', `/issues?state=closed&labels=alert&since=${since}&per_page=50`)) || []).filter((i) => new Date(i.closed_at) >= new Date(since));
} catch (e) { console.log(`(alert history unavailable: ${e.message})`); }

const mountRows = [...new Map(['root', 'uploads', 'backups'].filter((k) => f[`disk_${k}_mount`]).map((k) => [f[`disk_${k}_mount`], k]))]
  .map(([m, k]) => `\`${m}\` ${v(`disk_${k}_pct`)}% (${v(`disk_${k}_free_gb`)} GB حرّة)`).join(' · ');
const rows = has
  ? [
      ['الموقع (محلياً)', `backend HTTP ${v('health_backend')} · frontend HTTP ${v('health_frontend')}`],
      ['الخدمات', `backend ${v('unit_backend')} · frontend ${v('unit_frontend')} · nginx ${v('unit_nginx')} · postgres ${v('unit_postgres')} · إعادات تشغيل ${v('restarts_backend')}/${v('restarts_frontend')}`],
      ['القرص', `${mountRows || '—'} · inodes ${v('inode_root_pct')}%`],
      ['الذاكرة', `${v('mem_avail_mb')} MB متاحة من ${v('mem_total_mb')} · swap ${v('swap_used_mb')} MB`],
      ['الحمل', `${v('load1')} على ${count(num('cpus'), ['نواة واحدة', 'نواتين', 'أنوية', 'نواة'])} · الخادم يعمل منذ ${v('uptime_days')} يوم`],
      ['النسخ الاحتياطي', `${v('dump_newest')} · منذ ${hours(num('dump_age_h'))} · ${v('dump_size_kb')} KB · ${f.dump_valid === 'yes' ? 'صالحة' : 'غير صالحة'} · ${count(num('dump_count'), ['نسخة واحدة', 'نسختان', 'نسخ', 'نسخة'])} · ${v('backups_total')} · المؤقّت ${v('backup_timer')} · التالي ${v('backup_next')}`],
      ['أرشيف الرفع', `منذ ${f.uploads_archive_age_d === 'none' ? '— (لا أرشيف)' : days(num('uploads_archive_age_d'))} · الوسائط ${v('uploads_total')}`],
      ['قاعدة البيانات', `${v('db_size_mb')} MB · ${v('articles_published')} مادة منشورة · +${v('articles_7d')} خلال 7 أيام`],
      ['الشهادة', Number.isFinite(tlsDays) ? `تنتهي بعد ${days(tlsDays)}` : '—'],
      ['التحديثات التلقائية', `آخر تشغيل ${f.auto_updates_result === 'success' ? 'ناجح' : v('auto_updates_result')} (${v('auto_updates_last')})`],
      ['النظام', `حزم أمنية بانتظار التثبيت ${v('security_updates')} · إعادة تشغيل مطلوبة ${{ yes: 'نعم', no: 'لا' }[f.reboot_required] || '—'}` +
        `${f.reboot_required === 'yes' && f.kernel_installed ? ` (النواة ${v('kernel_running')} → ${v('kernel_installed')})` : ''}` +
        ` · وحدات فاشلة ${f.failed_units === 'none' ? 'لا يوجد' : v('failed_units')}`],
      ['سجل الخلفية', `${v('backend_err_24h')} سطر خطأ خلال 24 س · بلاغات CSP ${v('csp_reports_24h')}`],
    ]
  : [['الخادم', sshOk ? 'لا توجد حقائق (ملف فارغ)' : '❌ لم يصل الفحص إلى الخادم (SSH)'], ['الشهادة', Number.isFinite(tlsDays) ? `تنتهي بعد ${days(tlsDays)}` : '—']];
rows.push(['التنبيهات', `مفتوحة ${openAlerts.length}${openAlerts.length ? ' (' + openAlerts.map((i) => `#${i.number}`).join(' ') + ')' : ''} · أُغلقت خلال 7 أيام ${closedWeek.length}`]);
const report = `### تقرير ${today()}${weekly ? ' (أسبوعي)' : ''}\n| البند | القيمة |\n|---|---|\n` + rows.map(([a, b]) => `| ${a} | ${b} |`).join('\n');
summary(report);

if (weekly) {
  await ensureLabels(['ops', 'digest']);
  const digest = await openIssue('digest');
  if (digest) {
    await api('POST', `/issues/${digest.number}/comments`, { body: report + footer() });
    console.log(`🩺 weekly digest commented on #${digest.number}`);
  } else {
    const intro = 'تقرير آلي كل أحد صباحاً (07:17 عمّان) بحالة الخادم: الخدمات، القرص، النسخ الاحتياطي، قاعدة البيانات، الشهادة. ' +
      'يبقى هذا الموضوع مفتوحاً ويُضاف كل تقرير تعليقاً فيه. **إن توقّف وصول تقرير الأحد فافحص `monitor.yml` في Actions** ' +
      '(GitHub يوقف الجداول الزمنية بعد 60 يوماً بلا أي commit في المستودع).\n\n';
    const issue = await api('POST', '/issues', { title: '🩺 الصحة الأسبوعية — mutabe3.news', body: intro + report + footer(), labels: ['ops', 'digest'] });
    console.log(`🩺 weekly digest issue opened #${issue.number}`);
  }
}

process.exit(opened ? 1 : 0);
