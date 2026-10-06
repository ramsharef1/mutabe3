import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Response } from 'express';

// Secrets: never fall back to a known default in production (SECURITY S-05 / D-051).
// The process refuses to start rather than sign tokens anyone could forge.
const IS_PROD = process.env.NODE_ENV === 'production';
function requireSecret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET', devFallback: string): string {
  const v = process.env[name];
  if (IS_PROD) {
    if (!v || v === devFallback) throw new Error(`${name} is missing (or the dev default) — refusing to start in production`);
    if (v.length < 32) console.warn(`[auth] ${name} is shorter than 32 characters — rotate it to a longer random value`);
    return v;
  }
  return v || devFallback;
}
const JWT_SECRET = requireSecret('JWT_SECRET', 'dev-secret-change-in-production');
const JWT_REFRESH_SECRET = requireSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production');
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateJWT(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

export function verifyJWT(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export function generateEmailVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('authToken');
  res.clearCookie('refreshToken');
}
