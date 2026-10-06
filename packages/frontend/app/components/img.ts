// Responsive WebP delivery for editor uploads (D-045).
// The backend stores one WebP master per upload under /api/uploads/YYYY/MM/… and serves
// resized WebP derivatives at /api/img/<width>/YYYY/MM/… (widths 160–1280, cached). These
// helpers decide which <img> sources qualify and build the matching src/srcset; anything
// else — the demo picsum photos, pasted external URLs, gif/svg, data: — is passed through.
export const IMAGE_WIDTHS = [160, 320, 480, 640, 960, 1280] as const;

const UPLOAD_RE = /^(https?:\/\/[^/]+)?\/api\/uploads\/(\d{4}\/\d{2}\/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp))$/i;

/** Resized WebP URL of a local upload at width `w`; other sources come back unchanged. */
export function imgAt(src: string, w: number): string {
  const m = UPLOAD_RE.exec(src);
  return m ? `${m[1] || ''}/api/img/${w}/${m[2]}` : src;
}

/** `srcset` string for a local upload, or undefined when the source should stay as-is. */
export function srcSetFor(src: string | null | undefined, widths: readonly number[] = [640, 960]): string | undefined {
  if (!src || !UPLOAD_RE.test(src)) return undefined;
  return widths.map((w) => `${imgAt(src, w)} ${w}w`).join(', ');
}

/**
 * CMS body HTML (sanitized on write — img carries only src/alt/width/height/loading):
 * give every uploaded <img> a 640/960 srcset and a 960 fallback src. Idempotent.
 */
export function decorateRichImages(html: string): string {
  return html.replace(/<img\b([^>]*?)\ssrc="([^"]+)"([^>]*)>/gi, (tag: string, pre: string, src: string, post: string) => {
    const set = srcSetFor(src);
    if (!set || /\ssrcset=/i.test(tag)) return tag;
    return `<img${pre} src="${imgAt(src, 960)}" srcset="${set}" sizes="(max-width: 800px) 100vw, 760px"${post}>`;
  });
}
