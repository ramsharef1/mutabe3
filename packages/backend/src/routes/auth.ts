import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  hashPassword,
  verifyPassword,
  generateJWT,
  generateRefreshToken,
  generateEmailVerificationToken,
  setAuthCookie,
  setRefreshCookie,
  clearAuthCookies,
  verifyRefreshToken,
  REFRESH_TOKEN_TTL_MS,
} from '../auth';
import { sendVerificationEmail } from '../email';
import { authMiddleware } from '../middleware';
import { allow } from '../ratelimit';

const router = Router();
const prisma = new PrismaClient();

// ───────────────────────────── guards (SECURITY S-03/S-04, D-051) ─────────────────────────────
// Request bodies are JSON: a value meant to be a string could arrive as an object and would
// otherwise be passed straight into a database filter. Everything below is a string or rejected.
const str = (v: unknown, max = 512): string | null => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : null);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const email = (v: unknown): string | null => {
  const s = str(v, 254)?.trim().toLowerCase() ?? null;
  return s && EMAIL_RE.test(s) ? s : null;
};
const ip = (req: Request) => req.ip || 'unknown';
const tooMany = (res: Response) => res.status(429).json({ error: 'محاولات كثيرة — حاول بعد قليل' });
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const INVALID_CREDENTIALS = 'بيانات الدخول غير صحيحة';

// POST /auth/signup — reader accounts (VIEWER). Same answer whether or not the address exists,
// so the endpoint cannot be used to enumerate accounts.
router.post('/signup', async (req: Request, res: Response) => {
  try {
    if (!allow(`su:${ip(req)}`, 5, 60 * 60_000)) return tooMany(res);
    const e = email(req.body?.email);
    const password = str(req.body?.password, PASSWORD_MAX);
    const name = str(req.body?.name, 80)?.trim();
    if (!e || !password || !name) return res.status(400).json({ error: 'البريد وكلمة المرور والاسم مطلوبة' });
    if (password.length < PASSWORD_MIN) return res.status(400).json({ error: `كلمة المرور يجب ألا تقل عن ${PASSWORD_MIN} أحرف` });
    if (!allow(`su:${e}`, 3, 24 * 60 * 60_000)) return tooMany(res);

    const neutral = { success: true, message: 'إذا كان البريد جديداً فقد أرسلنا رسالة تفعيل إليه.' };
    const existingUser = await prisma.user.findUnique({ where: { email: e } });
    if (existingUser) return res.status(201).json(neutral);

    const verificationToken = generateEmailVerificationToken();
    const verificationExpires = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
    await prisma.user.create({
      data: { email: e, name, password: await hashPassword(password), role: 'VIEWER', emailVerificationToken: verificationToken, emailVerificationExpires: verificationExpires },
    });
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:9100'}/auth/verify?token=${verificationToken}`;
    await sendVerificationEmail(e, name, verificationLink);
    res.status(201).json(neutral);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'تعذّر إنشاء الحساب' });
  }
});

// POST /auth/verify
router.post('/verify', async (req: Request, res: Response) => {
  try {
    if (!allow(`vf:${ip(req)}`, 10, 15 * 60_000)) return tooMany(res);
    const token = str(req.body?.token, 128);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'رمز التفعيل غير صالح' });

    const user = await prisma.user.findFirst({ where: { emailVerificationToken: token, emailVerificationExpires: { gt: new Date() } } });
    if (!user) return res.status(400).json({ error: 'رمز التفعيل غير صالح أو منتهي' });

    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, emailVerificationToken: null, emailVerificationExpires: null } });
    res.json({ success: true, message: 'تم تفعيل البريد بنجاح' });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'تعذّر التفعيل' });
  }
});

// POST /auth/login — throttled per IP and per account; one message for every failure.
router.post('/login', async (req: Request, res: Response) => {
  try {
    if (!allow(`li:${ip(req)}`, 20, 15 * 60_000)) return tooMany(res);
    const e = email(req.body?.email);
    const password = str(req.body?.password, PASSWORD_MAX);
    if (!e || !password) return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });
    if (!allow(`li:${e}`, 8, 15 * 60_000)) return tooMany(res);

    const user = await prisma.user.findUnique({ where: { email: e } });
    // Always run the hash compare so a missing account takes as long as a wrong password.
    const passwordValid = await verifyPassword(password, user?.password ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    if (!user || !user.emailVerified || !passwordValid) return res.status(401).json({ error: INVALID_CREDENTIALS });

    const accessToken = generateJWT(user.id);
    const refreshToken = generateRefreshToken(user.id);
    await prisma.session.create({
      data: { userId: user.id, refreshToken, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS), ipAddress: req.ip, userAgent: String(req.headers['user-agent'] || '').slice(0, 255) },
    });
    setAuthCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);
    res.json({ success: true, accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'تعذّر تسجيل الدخول' });
  }
});

// POST /auth/refresh — rotates the refresh token: the presented one is retired and a new
// session row is issued, so a leaked token stops working the moment the real client refreshes.
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    if (!allow(`rf:${ip(req)}`, 60, 15 * 60_000)) return tooMany(res);
    const presented = str(req.body?.refreshToken, 2048);
    if (!presented) return res.status(400).json({ error: 'Refresh token is required' });
    if (!verifyRefreshToken(presented)) return res.status(401).json({ error: 'Invalid refresh token' });

    const session = await prisma.session.findUnique({ where: { refreshToken: presented }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) return res.status(401).json({ error: 'Session expired' });

    const refreshToken = generateRefreshToken(session.userId);
    await prisma.$transaction([
      prisma.session.delete({ where: { id: session.id } }),
      prisma.session.create({
        data: { userId: session.userId, refreshToken, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS), ipAddress: req.ip, userAgent: String(req.headers['user-agent'] || '').slice(0, 255) },
      }),
    ]);
    const accessToken = generateJWT(session.userId);
    setAuthCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);
    res.json({ success: true, accessToken, refreshToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, preferences: true, createdAt: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = str(req.body?.refreshToken, 2048);
    if (refreshToken) await prisma.session.deleteMany({ where: { refreshToken } });
    clearAuthCookies(res);
    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// POST /auth/change-password (authenticated) — verify current, set new, revoke every other session.
router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!allow(`cp:${userId}`, 10, 60 * 60_000)) return tooMany(res);
    const currentPassword = str(req.body?.currentPassword, PASSWORD_MAX);
    const newPassword = str(req.body?.newPassword, PASSWORD_MAX);
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    if (newPassword.length < PASSWORD_MIN) return res.status(400).json({ error: `كلمة المرور الجديدة يجب ألا تقل عن ${PASSWORD_MIN} أحرف` });
    if (newPassword === currentPassword) return res.status(400).json({ error: 'اختر كلمة مرور مختلفة عن الحالية' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!(await verifyPassword(currentPassword, user.password))) return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });

    const keep = str(req.body?.refreshToken, 2048); // the caller's own session may stay signed in
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { password: await hashPassword(newPassword) } }),
      prisma.session.deleteMany({ where: keep ? { userId, NOT: { refreshToken: keep } } : { userId } }),
    ]);
    res.json({ success: true, revokedOtherSessions: true });
  } catch (error) {
    console.error('Change-password error:', error);
    res.status(500).json({ error: 'تعذّر تغيير كلمة المرور' });
  }
});

export default router;
