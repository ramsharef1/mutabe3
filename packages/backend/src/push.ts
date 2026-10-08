// Web push for «عاجل» (D-072). Off until an admin switches it on in /dashboard/push. The VAPID key pair is
// generated once and kept in SiteSetting["push.config"], the private key sealed with secretbox (like the SMTP
// password) — no server environment change. Readers opt in from a button (never an automatic prompt); an
// editor sends each alert explicitly, at most one per 10 minutes, and every send is audited and logged.
import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import webpush from 'web-push';
import { seal, open, needsReseal } from './secretbox';
import { allow } from './ratelimit';
import { sendError } from './errors';

export const PUSH_KEY = 'push.config';
const SUBJECT = 'https://mutabe3.news';
export const SEND_GAP_MS = 10 * 60_000;
interface PushConfig { enabled: boolean; publicKey: string; privateBox: string }

// The server POSTs to whatever endpoint a browser registered, so only real push services are accepted
// (otherwise a crafted "subscription" would make the server call any host — SSRF).
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^[a-z0-9.-]+\.push\.apple\.com$/, /^[a-z0-9.-]+\.notify\.windows\.com$/];
export const pushHostAllowed = (endpoint: string) => {
  try {
    const u = new URL(endpoint);
    // local development only: a fake push service on this machine (the D-072 delivery test)
    if (process.env.NODE_ENV !== 'production' && u.hostname === '127.0.0.1') return true;
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch { return false; }
};
const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

/** Read the config; with `create`, generate and store the key pair the first time. */
export async function readPush(prisma: PrismaClient, create = false): Promise<PushConfig | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key: PUSH_KEY } });
  if (row) {
    const cfg = row.value as unknown as PushConfig;
    if (needsReseal(cfg.privateBox)) { // D-073: re-seal a v1 box with the push purpose key
      const plain = open(cfg.privateBox);
      if (plain !== null) {
        const next = { ...cfg, privateBox: seal(plain, 'push') };
        await prisma.siteSetting.update({ where: { key: PUSH_KEY }, data: { value: next as unknown as Prisma.InputJsonObject } });
        return next;
      }
    }
    return cfg;
  }
  if (!create) return null;
  const keys = webpush.generateVAPIDKeys();
  const value: PushConfig = { enabled: false, publicKey: keys.publicKey, privateBox: seal(keys.privateKey, 'push') };
  await prisma.siteSetting.create({ data: { key: PUSH_KEY, value: value as unknown as Prisma.InputJsonObject } });
  return value;
}

export async function setPushEnabled(prisma: PrismaClient, enabled: boolean) {
  const cfg = (await readPush(prisma, true))!;
  const value = { ...cfg, enabled } as unknown as Prisma.InputJsonObject;
  await prisma.siteSetting.update({ where: { key: PUSH_KEY }, data: { value } });
  return { ...cfg, enabled };
}

/** Delivery runs in the background; counts land on the PushSend row. */
async function deliver(prisma: PrismaClient, sendId: string, payload: string, cfg: PushConfig) {
  const privateKey = open(cfg.privateBox);
  let sent = 0, failed = 0, removed = 0;
  if (!privateKey) {
    console.error('[push] private key does not decrypt (JWT_SECRET rotated?) — nothing sent');
  } else {
    const vapidDetails = { subject: SUBJECT, publicKey: cfg.publicKey, privateKey };
    let cursor: string | undefined;
    for (;;) {
      const batch = await prisma.pushSubscription.findMany({ take: 200, orderBy: { id: 'asc' }, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}) });
      if (!batch.length) break;
      cursor = batch[batch.length - 1].id;
      for (let i = 0; i < batch.length; i += 10) {
        await Promise.all(batch.slice(i, i + 10).map(async (s) => {
          if (!pushHostAllowed(s.endpoint)) { await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {}); removed++; return; }
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: 'high', vapidDetails, timeout: 10_000 });
            sent++;
            await prisma.pushSubscription.update({ where: { id: s.id }, data: { lastOkAt: new Date(), failures: 0 } }).catch(() => {});
          } catch (e: any) {
            const code = e?.statusCode;
            if (code === 404 || code === 410 || s.failures >= 4) { await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {}); removed++; }
            else {
              failed++;
              await prisma.pushSubscription.update({ where: { id: s.id }, data: { failures: { increment: 1 } } }).catch(() => {});
              // host and status only — the endpoint itself identifies a reader's browser
              console.warn(`[push] delivery failed ${code ?? e?.code ?? '-'} via ${new URL(s.endpoint).hostname}: ${String(e?.body || e?.message || '').slice(0, 120)}`);
            }
          }
        }));
      }
    }
  }
  await prisma.pushSend.update({ where: { id: sendId }, data: { sent, failed, removed, status: 'done', doneAt: new Date() } });
}

/** Start an alert. Returns the PushSend row, or an Arabic error. */
export async function sendAlert(prisma: PrismaClient, input: { title: string; url: string }, actorId: string):
  Promise<{ ok: true; send: { id: string; total: number } } | { ok: false; status: number; error: string }> {
  const cfg = await readPush(prisma);
  if (!cfg?.enabled) return { ok: false, status: 400, error: 'تنبيهات المتصفح متوقفة — شغّلها أولاً' };
  const last = await prisma.pushSend.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
  if (last && Date.now() - last.createdAt.getTime() < SEND_GAP_MS) {
    const mins = Math.ceil((SEND_GAP_MS - (Date.now() - last.createdAt.getTime())) / 60_000);
    return { ok: false, status: 429, error: `أُرسل تنبيه قبل قليل — يمكن إرسال التالي بعد ${mins} دقيقة` };
  }
  const total = await prisma.pushSubscription.count();
  const send = await prisma.pushSend.create({ data: { title: input.title, url: input.url, actorId, total } });
  const payload = JSON.stringify({ title: 'عاجل · المتابع', body: input.title, url: input.url, tag: 'breaking' });
  deliver(prisma, send.id, payload, cfg).catch(async (e) => {
    console.error('[push] delivery failed:', e);
    await prisma.pushSend.update({ where: { id: send.id }, data: { status: 'done', doneAt: new Date() } }).catch(() => {});
  });
  return { ok: true, send: { id: send.id, total } };
}

/** Public: key (only while enabled), subscribe, unsubscribe. */
export function pushRoutes(prisma: PrismaClient) {
  const router = Router();
  const ip = (req: Request) => req.ip || 'unknown';

  router.get('/push/key', async (_req: Request, res: Response) => {
    try {
      const cfg = await readPush(prisma);
      res.json({ success: true, data: { enabled: !!cfg?.enabled, publicKey: cfg?.enabled ? cfg.publicKey : null } });
    } catch (e) { sendError(res, e); }
  });

  router.post('/push/subscribe', async (req: Request, res: Response) => {
    try {
      if (!allow(`ps:${ip(req)}`, 10, 60 * 60_000)) return res.status(429).json({ error: 'محاولات كثيرة — حاول بعد قليل' });
      const cfg = await readPush(prisma);
      if (!cfg?.enabled) return res.status(404).json({ error: 'التنبيهات غير مفعّلة', code: 'PUSH_OFF' });
      const s = req.body?.subscription || req.body;
      const endpoint = typeof s?.endpoint === 'string' ? s.endpoint : '';
      const p256dh = typeof s?.keys?.p256dh === 'string' ? s.keys.p256dh : '';
      const auth = typeof s?.keys?.auth === 'string' ? s.keys.auth : '';
      if (endpoint.length > 1000 || !pushHostAllowed(endpoint) || !B64URL.test(p256dh) || p256dh.length > 200 || !B64URL.test(auth) || auth.length > 100) {
        return res.status(400).json({ error: 'اشتراك غير صالح', code: 'BAD_SUBSCRIPTION' });
      }
      await prisma.pushSubscription.upsert({ where: { endpoint }, update: { p256dh, auth, failures: 0 }, create: { endpoint, p256dh, auth } });
      res.status(201).json({ success: true });
    } catch (e) { sendError(res, e); }
  });

  router.post('/push/unsubscribe', async (req: Request, res: Response) => {
    try {
      if (!allow(`pu:${ip(req)}`, 20, 60 * 60_000)) return res.status(429).json({ error: 'محاولات كثيرة — حاول بعد قليل' });
      const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
      if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint } });
      res.json({ success: true });
    } catch (e) { sendError(res, e); }
  });

  return router;
}
