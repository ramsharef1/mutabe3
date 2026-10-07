import { PrismaClient } from '@prisma/client';
import { autoDigestTick, reapStuckSends } from './newsletter';
import { flushAdStats } from './ads';

// Scheduled publishing: once a minute, every SCHEDULED article whose
// scheduledPublishAt has passed becomes PUBLISHED, dated at the scheduled time
// so "منذ …" and the sitemap stay truthful (D-043 Stage 3).
export async function publishDue(prisma: PrismaClient) {
  const due = await prisma.article.findMany({
    where: { status: 'SCHEDULED', scheduledPublishAt: { lte: new Date() } },
    select: { id: true, title: true, scheduledPublishAt: true },
  });
  for (const a of due) {
    await prisma.article.update({
      where: { id: a.id },
      data: { status: 'PUBLISHED', publishedAt: a.scheduledPublishAt ?? new Date() },
    });
    console.log(`⏰ published scheduled article ${a.id} — ${a.title}`);
  }
  return due.length;
}

// Expired refresh sessions used to accumulate forever (SECURITY S-05 / D-051): sweep them hourly.
let lastSessionSweep = 0;
export async function purgeExpiredSessions(prisma: PrismaClient) {
  if (Date.now() - lastSessionSweep < 60 * 60_000) return 0;
  lastSessionSweep = Date.now();
  const { count } = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  if (count) console.log(`🧹 purged ${count} expired session(s)`);
  return count;
}

export function startScheduler(prisma: PrismaClient, everyMs = 60_000) {
  const tick = () => {
    publishDue(prisma).catch((e) => console.error('scheduler:', e));
    autoDigestTick(prisma).catch((e) => console.error('auto digest:', e)); // D-043 Stage 4, off unless enabled
    purgeExpiredSessions(prisma).catch((e) => console.error('session sweep:', e));
    reapStuckSends(prisma).catch((e) => console.error('newsletter reaper:', e)); // D-054
    flushAdStats(prisma).catch((e) => console.error('ad stats flush:', e)); // D-057
  };
  tick();
  const handle = setInterval(tick, everyMs);
  handle.unref?.(); // never keeps the process alive on its own
  return handle;
}
