// Dashboard-side helpers for the admin API: auth header + image upload/listing.
import { adminFetch } from './staff';

export const token = () => { try { return localStorage.getItem('accessToken'); } catch { return null; } };
export const authHeaders = (): Record<string, string> => { const t = token(); return t ? { Authorization: `Bearer ${t}` } : {}; };

export interface MediaItem { url: string; name: string; size: number; at: number }

/** Downscale big photos in the browser (≤1600px, JPEG 0.85) so uploads stay small and article pages fast. */
export async function shrink(file: File, max = 1600, quality = 0.85): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400 * 1024) return file;
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); } catch { return file; }
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) { bmp.close(); return file; }
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', quality));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], `${file.name.replace(/\.\w+$/, '')}.jpg`, { type: 'image/jpeg' });
}

/** Upload one image → stored URL (/api/uploads/YYYY/MM/xxx.jpg). Throws with an Arabic message on failure. */
export async function uploadImage(file: File): Promise<string> {
  const f = await shrink(file);
  const fd = new FormData();
  fd.append('file', f, f.name);
  const res = await adminFetch('/api/admin/upload', { method: 'POST', body: fd });
  const j = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('انتهت الجلسة — سجّل الدخول من جديد');
  if (!res.ok) throw new Error(j.error || 'فشل رفع الصورة');
  return j.url as string;
}

export async function listMedia(): Promise<MediaItem[]> {
  const res = await adminFetch('/api/admin/media');
  if (!res.ok) throw new Error('media');
  return ((await res.json()).data || []) as MediaItem[];
}
