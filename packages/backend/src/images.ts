// WebP image pipeline (D-045, adopted from okath's Laravel/GD recipe, rebuilt on sharp).
//
//  Layer 1 — ingestImage(): every uploaded JPEG/PNG/WebP becomes ONE WebP master
//            (quality 82, EXIF auto-rotated, width capped at 2048, alpha flattened
//            onto white). Only the WebP is stored. GIF and animated WebP pass through
//            untouched so advertiser/animated creatives keep their frames, and any
//            decode failure falls back to storing the original bytes — an upload is
//            never lost because of the converter.
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

/** Raster formats we re-encode. Everything else (gif, svg, …) is stored and served as-is. */
const TRANSCODABLE = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TRANSCODABLE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);

export interface Ingested {
  buffer: Buffer;
  ext: string;
  mime: string;
  /** true when the stored bytes are the WebP master, false when the original was kept */
  converted: boolean;
  width?: number;
  height?: number;
}

/** One sharp pipeline for masters and derivatives: orient → cap width → flatten → WebP. */
export function toWebp(input: Buffer | string, width: number, quality: number) {
  return sharp(input, { failOn: 'none' })
    .rotate() // apply EXIF orientation, then drop the tag
    .resize({ width, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .webp({ quality, effort: 4 })
    .toBuffer({ resolveWithObject: true });
}

const isAnimated = async (input: Buffer | string) => ((await sharp(input).metadata()).pages ?? 1) > 1;

/** Transcode an upload to a WebP master, or hand back the original bytes when that is the right call. */
export async function ingestImage(input: Buffer, mimetype: string, ext: string): Promise<Ingested> {
  const original: Ingested = { buffer: input, ext, mime: mimetype, converted: false };
  if (!TRANSCODABLE.has(mimetype)) return original; // gif (animation) and anything exotic
  try {
    if (mimetype === 'image/webp' && (await isAnimated(input))) return original;
    const { data, info } = await toWebp(input, MASTER_MAX_WIDTH, MASTER_QUALITY);
    if (data.length < 100) return original;
    return { buffer: data, ext: 'webp', mime: 'image/webp', converted: true, width: info.width, height: info.height };
  } catch (e) {
    console.warn('[images] keeping original upload, WebP transcode failed:', (e as Error).message);
    return original;
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
