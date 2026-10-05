import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';

// Uploaded images live outside the git checkout (UPLOAD_DIR in /etc/mutabe3/backend.env
// on the VPS) and are served back at /api/uploads/… so nginx needs no extra location.
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
export const UPLOAD_URL = '/api/uploads';
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const toUrl = (abs: string) => `${UPLOAD_URL}/${path.relative(UPLOAD_DIR, abs).split(path.sep).join('/')}`;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const d = new Date();
    const dir = path.join(UPLOAD_DIR, String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) =>
    cb(null, `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}.${MIME_EXT[file.mimetype] || 'bin'}`),
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => (MIME_EXT[file.mimetype] ? cb(null, true) : cb(new Error('Unsupported file type (jpeg/png/webp/gif only)'))),
});

export const uploadedFileUrl = (file: Express.Multer.File) => toUrl(file.path);

export interface MediaItem { url: string; size: number; at: number; name: string }

/** Newest-first listing of everything under UPLOAD_DIR (two levels: YYYY/MM). */
export const listMedia = (limit = 200): MediaItem[] => {
  const out: MediaItem[] = [];
  const walk = (dir: string, depth: number) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (depth < 2) walk(p, depth + 1); continue; }
      const st = fs.statSync(p);
      out.push({ url: toUrl(p), size: st.size, at: st.mtimeMs, name: e.name });
    }
  };
  walk(UPLOAD_DIR, 0);
  return out.sort((a, b) => b.at - a.at).slice(0, limit);
};
