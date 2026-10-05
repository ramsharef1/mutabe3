import { PrismaClient } from '@prisma/client';

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

export function startScheduler(prisma: PrismaClient, everyMs = 60_000) {
  const tick = () => publishDue(prisma).catch((e) => console.error('scheduler:', e));
  tick();
  const handle = setInterval(tick, everyMs);
  handle.unref?.(); // never keeps the process alive on its own
  return handle;
}
