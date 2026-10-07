// WebP image pipeline (D-045, adopted from okath's Laravel/GD recipe, rebuilt on sharp).
//
//  Layer 1 — ingestImage(): the file's real format is read from its bytes by sharp — the
//            client-declared MIME type is ignored (D-065, SECURITY S-11). Only JPEG, PNG,
//            WebP and GIF decode; each becomes ONE WebP master (quality 82, EXIF
//            auto-rotated, width capped at 2048, alpha flattened onto white). Animated GIF
//            and WebP are re-encoded as animated WebP so creatives keep their frames. Anything
//            else, or any decode failure, is refused — original bytes are never stored.
//  Layer 2 — ensureDerivative(): resized WebP derivatives at a width whitelist,
//            generated on first request and cached under UPLOAD_DIR/.cache/w<width>/…,
//            regenerated whenever the master changes. Served by GET /api/img/:w/<rel>.
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

export const MASTER_QUALITY = 82;
export const MASTER_MAX_WIDTH = 2048;
export const DERIVATIVE_QUALITY = 75;
export const IMAGE_WIDTHS: readonly number[] = [160, 320, 480, 640, 960, 1280];
export const CACHE_DIRNAME = '.cache';

/** Formats sharp may decode from an upload (by content, never by the declared type). SVG is not among them. */
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif']);
const TRANSCODABLE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);

/** An upload that is not a decodable JPEG/PNG/WebP/GIF; the message is safe to show the editor. */
export class RejectedImage extends Error {}

export interface Ingested {
  buffer: Buffer;
  ext: string;
  mime: string;
  /** always true since D-065: the stored bytes are a WebP the server encoded itself */
  converted: boolean;
  width?: number;
  height?: number;
}

/** One sharp pipeline for masters and derivatives: orient → cap width → flatten → WebP. */
export function toWebp(input: Buffer | string, width: number, quality: number, failOn: 'none' | 'truncated' = 'none') {
  return sharp(input, { failOn })
    .rotate() // apply EXIF orientation, then drop the tag
    .resize({ width, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .webp({ quality, effort: 4 })
    .toBuffer({ resolveWithObject: true });
}

const isAnimated = async (input: Buffer | string) => ((await sharp(input).metadata()).pages ?? 1) > 1;

/** Re-encode an upload as a WebP master, or throw RejectedImage. */
export async function ingestImage(input: Buffer): Promise<Ingested> {
  let format: string | undefined, pages = 1;
  try {
    const meta = await sharp(input).metadata();
    format = meta.format;
    pages = meta.pages ?? 1;
  } catch { /* not an image sharp can read */ }
  if (!format || !ACCEPTED_FORMATS.has(format)) throw new RejectedImage('الملف ليس صورة مدعومة (JPEG أو PNG أو WebP أو GIF)');
  try {
    const { data, info } = pages > 1
      ? await sharp(input, { animated: true, failOn: 'truncated' })
        .resize({ width: MASTER_MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: MASTER_QUALITY, effort: 4 })
        .toBuffer({ resolveWithObject: true })
      : await toWebp(input, MASTER_MAX_WIDTH, MASTER_QUALITY, 'truncated');
    if (!data.length) throw new Error('empty output');
    return { buffer: data, ext: 'webp', mime: 'image/webp', converted: true, width: info.width, height: info.pageHeight ?? info.height };
  } catch (e) {
    console.warn(`[images] upload refused, ${format} decode failed:`, (e as Error).message);
    throw new RejectedImage('تعذّرت قراءة الصورة، قد يكون الملف تالفاً');
  }
}

/** True for stored files that the derivative route may resize (by extension). */
export const isTranscodableFile = (file: string) => TRANSCODABLE_EXT.has(path.extname(file).slice(1).toLowerCase());

/** Cache path of the `w`-wide derivative of `rel` (e.g. 2026/10/abc.jpg → .cache/w640/2026/10/abc.webp). */
export const derivativePath = (uploadDir: string, rel: string, w: number) =>
  path.join(uploadDir, CACHE_DIRNAME, `w${w}`, `${rel.replace(/\.[a-z0-9]+$/i, '')}.webp`);

/**
 * Make sure the derivative at `dst` exists and is newer than the master at `src`.
 * Returns false when the master must be served as-is (animated WebP).
 * Writes atomically (tmp + rename) so two concurrent first requests never serve a torn file.
 */
export async function ensureDerivative(src: string, dst: string, w: number): Promise<boolean> {
  const srcStat = fs.statSync(src);
  try {
    if (fs.statSync(dst).mtimeMs >= srcStat.mtimeMs) return true;
  } catch { /* not cached yet */ }
  if (path.extname(src).toLowerCase() === '.webp' && (await isAnimated(src))) return false;
  const { data } = await toWebp(src, w, DERIVATIVE_QUALITY);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const tmp = `${dst}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, dst);
  return true;
}
