import { PrismaClient, Prisma } from '@prisma/client';
import { Request } from 'express';
import { fingerprint } from './ratelimit';

// Append-only audit trail (SECURITY S-08/S-16, D-064). Every staff action that changes content, people,
// ads or mail calls audit() once, after it succeeded. Writing never throws: a failed audit insert is
// logged and the action it describes still stands (availability first; the console line is the fallback).
export type Actor = { id: string; name: string; role: string } | null;
export interface AuditEntry {
  action: string;
  targetType?: string;
  targetId?: string | null;
  summary?: string;
  meta?: Record<string, unknown>;
}

export const RETENTION_DAYS = 730; // 24 months (SECURITY §Audit log)

export async function audit(prisma: PrismaClient, actor: Actor, req: Request | null, e: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorName: actor?.name ?? null,
        actorRole: actor?.role ?? null,
        action: e.action.slice(0, 60),
        targetType: e.targetType ?? null,
        targetId: e.targetId ?? null,
        summary: e.summary ? e.summary.slice(0, 300) : null,
        meta: e.meta ? (JSON.parse(JSON.stringify(e.meta)) as Prisma.InputJsonValue) : undefined,
        ipHash: req?.ip ? fingerprint('ip', req.ip) : null,
      },
    });
  } catch (err) {
    console.error(`[audit] write failed for ${e.action}:`, err);
  }
}

/** «العنوان» trimmed for a one-line summary. */
export const q = (s: unknown, max = 80) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return `«${t.length > max ? `${t.slice(0, max - 1)}…` : t}»`;
};

// Retention: the only deletion this table ever sees. Checked hourly, cheap (indexed on `at`).
let lastSweep = 0;
export async function purgeOldAudit(prisma: PrismaClient) {
  if (Date.now() - lastSweep < 60 * 60_000) return 0;
  lastSweep = Date.now();
  const { count } = await prisma.auditLog.deleteMany({ where: { at: { lt: new Date(Date.now() - RETENTION_DAYS * 86_400_000) } } });
  if (count) console.log(`🧹 audit log: dropped ${count} entr${count === 1 ? 'y' : 'ies'} older than 24 months`);
  return count;
}

/** Page of entries, newest first. Filters: action prefix (e.g. "article"), actor id, target. */
export async function listAudit(prisma: PrismaClient, opts: { take?: number; cursor?: string; action?: string; actorId?: string; targetId?: string }) {
  const take = Math.min(200, Math.max(1, opts.take || 50));
  const where: Prisma.AuditLogWhereInput = {};
  if (opts.action) where.action = { startsWith: opts.action };
  if (opts.actorId === 'system') where.actorId = null;
  else if (opts.actorId) where.actorId = opts.actorId;
  if (opts.targetId) where.targetId = opts.targetId;
  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ at: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });
  const more = rows.length > take;
  const page = more ? rows.slice(0, take) : rows;
  return {
    data: page.map((r) => ({ ...r, ipHash: r.ipHash ? r.ipHash.slice(0, 8) : null })),
    next: more ? page[page.length - 1].id : null,
  };
}
