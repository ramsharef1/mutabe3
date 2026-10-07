import sanitizeHtml from 'sanitize-html';

// Article bodies arrive as HTML from the dashboard editor. Everything stored in
// Article.content passes through here, so the public site can render it with
// dangerouslySetInnerHTML without a second sanitizer.
const OWN_HOST = /^https?:\/\/(www\.)?mutabe3\.news(\/|$)/;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'h2', 'h3', 'h4', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup',
    'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'hr', 'iframe',
  ],
  allowedAttributes: {
    '*': ['dir'],
    a: ['href', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'title'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] }, // relative /api/uploads/… has no scheme and passes
  allowProtocolRelative: false,
  allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com'],
  transformTags: {
    h1: 'h2', // article title is the only h1 on the page
    a: (tagName, attribs) => {
      const href = attribs.href || '';
      const external = /^https?:\/\//.test(href) && !OWN_HOST.test(href);
      return { tagName, attribs: external ? { ...attribs, target: '_blank', rel: 'noopener' } : attribs };
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
  },
  // Drop empty paragraphs the editor leaves behind (keeping media-only ones), and
  // media shells whose src was rejected above (data: URIs, non-YouTube iframes).
  exclusiveFilter: (frame) =>
    (frame.tag === 'p' && !frame.text.trim() && frame.mediaChildren.length === 0) ||
    ((frame.tag === 'img' || frame.tag === 'iframe') && !frame.attribs.src),
};

const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Plain text (API clients, legacy seeds) → paragraphs, so stored content is always HTML. */
export const textToHtml = (text: string) =>
  text.trim().split(/\n{2,}/).map((p) => `<p>${escapeText(p.trim()).replace(/\n/g, '<br />')}</p>`).join('');

export const looksLikeHtml = (s: string) => /<\/?[a-z][^>]*>/i.test(s || '');

export const sanitizeArticleHtml = (content: string) => {
  const html = looksLikeHtml(content) ? content : textToHtml(content || '');
  return sanitizeHtml(html, OPTIONS).trim();
};

// Reader comments are plain text and never carry links (D-065, SECURITY S-13): URLs with a scheme,
// www.… and bare domains (ASCII host + letter TLD, with any path) are cut out, e-mail addresses with
// them; the rest of the text is kept. Decimal numbers ("3.14") and Arabic text never match.
const LINK_RE = /(?:[a-z][a-z0-9+.-]*:\/\/|www\.)\S+|[^\s@]+@[^\s@]+\.[a-z]{2,}\S*|\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}\b(?:[/?#:]\S*)?/gi;

export const stripLinks = (text: string) => text.search(LINK_RE) === -1 ? text.trim() :
  text.replace(LINK_RE, ' ').replace(/[^\S\n]{2,}/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
