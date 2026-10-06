import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import type { Request, Response } from 'express';
import { CACHE_DIRNAME, IMAGE_WIDTHS, derivativePath, ensureDerivative, ingestImage, isTranscodableFile } from './images';

// Uploaded images live outside the git checkout (UPLOAD_DIR in /etc/mutabe3/backend.env
// on the VPS) and are served back at /api/uploads/… so nginx needs no extra location.
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
export const UPLOAD_URL = '/api/uploads';
/** Resized WebP derivatives: /api/img/<width>/YYYY/MM/name.ext (D-045). */
export const IMG_URL = '/api/img';
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const toUrl = (abs: string) => `${UPLOAD_URL}/${path.relative(UPLOAD_DIR, abs).split(path.sep).join('/')}`;

// Files are buffered in memory (≤15MB, one per request) so the WebP master can be
// written in one go — no original ever touches the disk unless conversion is skipped.
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => (MIME_EXT[file.mimetype] ? cb(null, true) : cb(new Error('Unsupported file type (jpeg/png/webp/gif only)'))),
});

export interface StoredUpload { url: string; size: number; mime: string; converted: boolean; width?: number; height?: number }

/** Persist one multer upload under UPLOAD_DIR/YYYY/MM as a WebP master (or untouched when ingest says so). */
export async function storeUpload(file: Express.Multer.File): Promise<StoredUpload> {
  const d = new Date();
  const dir = path.join(UPLOAD_DIR, String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'));
  fs.mkdirSync(dir, { recursive: true });
  const img = await ingestImage(file.buffer, file.mimetype, MIME_EXT[file.mimetype] || 'bin');
  const abs = path.join(dir, `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}.${img.ext}`);
  fs.writeFileSync(abs, img.buffer, { flag: 'wx' });
  return { url: toUrl(abs), size: img.buffer.length, mime: img.mime, converted: img.converted, width: img.width, height: img.height };
}

export interface MediaItem { url: string; size: number; at: number; name: string }

/** Newest-first listing of everything under UPLOAD_DIR (two levels: YYYY/MM); the derivative cache is skipped. */
export const listMedia = (limit = 200): MediaItem[] => {
  const out: MediaItem[] = [];
  const walk = (dir: string, depth: number) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue; // .cache and friends
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (depth < 2) walk(p, depth + 1); continue; }
      const st = fs.statSync(p);
      out.push({ url: toUrl(p), size: st.size, at: st.mtimeMs, name: e.name });
    }
  };
  walk(UPLOAD_DIR, 0);
  return out.sort((a, b) => b.at - a.at).slice(0, limit);
};

// Only the shapes storeUpload() produces: YYYY/MM/<random>.<ext>. Anything else (dots,
// slashes, the .cache dir) is a 404 before we ever touch the filesystem.
const REL_RE = /^\d{4}\/\d{2}\/[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/;
const IMMUTABLE = { 'Cache-Control': 'public, max-age=2592000, immutable' };

/**
 * GET /api/img/:w/YYYY/MM/name.ext → the master resized to width w as WebP (cached).
 * Widths outside IMAGE_WIDTHS and unknown files are 404; gif/svg/animated files and any
 * conversion error fall back to the untouched master so a page never loses its image.
 */
export async function serveDerivative(req: Request, res: Response) {
  const w = Number(req.params.w);
  const rel = String(req.params[0] || '');
  if (!IMAGE_WIDTHS.includes(w) || !REL_RE.test(rel)) return res.status(404).end();
  const src = path.join(UPLOAD_DIR, rel);
  if (!src.startsWith(UPLOAD_DIR + path.sep) || !fs.existsSync(src)) return res.status(404).end();
  if (!isTranscodableFile(src)) return res.sendFile(src, { headers: IMMUTABLE });
  try {
    const dst = derivativePath(UPLOAD_DIR, rel, w);
    if (!(await ensureDerivative(src, dst, w))) return res.sendFile(src, { headers: IMMUTABLE });
    return res.sendFile(dst, { headers: { ...IMMUTABLE, 'Content-Type': 'image/webp' } });
  } catch (e) {
    console.warn(`[images] derivative w${w} failed for ${rel}, serving master:`, (e as Error).message);
    return res.sendFile(src, { headers: IMMUTABLE });
  }
}

export const cacheDir = () => path.join(UPLOAD_DIR, CACHE_DIRNAME);
