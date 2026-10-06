'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { plain } from '../../components/util';
import { imgAt } from '../../components/img';
import type { MediaItem } from './upload';

// Dependency-free rich text editor: a contentEditable body driven by execCommand,
// emitting HTML. The backend sanitizes on save, so this only needs to produce
// tidy markup from the toolbar and from pasted Word/Docs content.

interface Props {
  value: string;                              // HTML
  onChange: (html: string) => void;
  upload: (file: File) => Promise<string>;    // resolves to the stored URL
  listMedia?: () => Promise<MediaItem[]>;
  placeholder?: string;
}

const ALLOWED = new Set(['P', 'BR', 'H2', 'H3', 'H4', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'SUB', 'SUP', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'A', 'IMG', 'FIGURE', 'FIGCAPTION', 'HR', 'IFRAME']);
const BLOCKS = new Set(['P', 'H2', 'H3', 'H4', 'UL', 'OL', 'BLOCKQUOTE', 'FIGURE', 'DIV', 'TABLE', 'HR']);
const KEEP: Record<string, string[]> = { A: ['href'], IMG: ['src', 'alt'], IFRAME: ['src', 'allow', 'allowfullscreen'] };
const DROP = new Set(['STYLE', 'SCRIPT', 'META', 'LINK', 'TITLE', 'HEAD']);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const textToHtml = (t: string) => t.trim().split(/\n{2,}/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
const ytId = (u: string) => (u.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/) || [])[1];

/** Pasted markup (Word / Google Docs / web pages) → only the tags the backend keeps. */
function clean(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (parent: Element) => {
    Array.from(parent.children).forEach((el) => {
      walk(el);
      const tag = el.tagName;
      const unwrap = () => el.replaceWith(...Array.from(el.childNodes));
      if (DROP.has(tag)) { el.remove(); return; }
      if (tag === 'H1') { const h = doc.createElement('h2'); h.innerHTML = el.innerHTML; el.replaceWith(h); return; }
      // Google Docs wraps everything in <b style="font-weight:normal">
      if ((tag === 'B' || tag === 'STRONG') && (el as HTMLElement).style.fontWeight === 'normal') { unwrap(); return; }
      if (tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE') {
        if (Array.from(el.children).some((c) => BLOCKS.has(c.tagName))) { unwrap(); return; }
        const p = doc.createElement('p'); p.innerHTML = el.innerHTML; el.replaceWith(p); return;
      }
      if (!ALLOWED.has(tag)) { unwrap(); return; }
      Array.from(el.attributes).forEach((a) => { if (!(KEEP[tag] || []).includes(a.name)) el.removeAttribute(a.name); });
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

const TB = ({ on, title, onClick, children }: { on?: boolean; title: string; onClick: () => void; children: ReactNode }) => (
  <button type="button" className={on ? 'on' : ''} title={title} aria-pressed={on} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>{children}</button>
);

export default function RichEditor({ value, onChange, upload, listMedia, placeholder = 'نص المقال…' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const last = useRef('');
  const savedRange = useRef<Range | null>(null);
  const [src, setSrc] = useState(false);              // HTML source mode
  const [srcText, setSrcText] = useState('');
  const [busy, setBusy] = useState(0);                // uploads in flight
  const [lib, setLib] = useState<MediaItem[] | null>(null); // null = picker closed
  const [libBusy, setLibBusy] = useState(false);
  const [state, setState] = useState({ b: false, i: false, u: false, block: 'p' });

  // Load an external value (initial fetch / reset) without clobbering the caret while typing.
  useEffect(() => {
    if (!ref.current || value === last.current) return;
    ref.current.innerHTML = value;
    last.current = value;
  }, [value]);

  useEffect(() => { try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch {} }, []);

  const emit = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    last.current = html;
    onChange(html);
  }, [onChange]);

  // Runs on every selection change: refreshes toolbar state and remembers the last
  // caret position inside the editor, so prompts/modals/uploads (which steal focus)
  // can insert where the author was, not at the start of the body.
  const refresh = useCallback(() => {
    try {
      const s = window.getSelection();
      if (s && s.rangeCount && ref.current?.contains(s.anchorNode)) savedRange.current = s.getRangeAt(0).cloneRange();
      setState({
        b: document.queryCommandState('bold'),
        i: document.queryCommandState('italic'),
        u: document.queryCommandState('underline'),
        block: String(document.queryCommandValue('formatBlock') || 'p').toLowerCase(),
      });
    } catch {}
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', refresh);
    return () => document.removeEventListener('selectionchange', refresh);
  }, [refresh]);

  const saveSel = refresh;
  const restoreSel = () => {
    const el = ref.current; if (!el) return;
    el.focus();
    const s = window.getSelection(); if (!s) return;
    s.removeAllRanges();
    if (savedRange.current) { s.addRange(savedRange.current); return; }
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); s.addRange(r); // caret at end
  };

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit(); refresh();
  };
  const block = (tag: string) => exec('formatBlock', `<${state.block === tag ? 'p' : tag}>`);
  const insertHtml = (html: string) => exec('insertHTML', html);

  const addLink = () => {
    const sel = window.getSelection();
    const collapsed = !sel || sel.isCollapsed;
    saveSel();
    const url = prompt('الرابط (URL):', 'https://');
    if (!url || url === 'https://') return;
    restoreSel();
    if (collapsed) insertHtml(`<a href="${esc(url)}">${esc(url)}</a>`);
    else exec('createLink', url);
  };

  const insertImage = async (file: File) => {
    saveSel();
    setBusy((n) => n + 1);
    try {
      const url = await upload(file);
      const cap = prompt('تعليق الصورة (اختياري):', '') || '';
      restoreSel();
      insertHtml(`<figure><img src="${esc(url)}" alt="${esc(cap)}">${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure><p><br></p>`);
    } catch (e: any) { alert(e?.message || 'فشل رفع الصورة'); }
    finally { setBusy((n) => n - 1); }
  };
  const insertFiles = async (files: File[]) => { for (const f of files) await insertImage(f); };

  const addVideo = () => {
    saveSel();
    const u = prompt('رابط يوتيوب:', '');
    if (!u) return;
    const id = ytId(u);
    if (!id) { alert('لم يُتعرَّف على رابط يوتيوب.'); return; }
    restoreSel();
    insertHtml(`<figure><iframe src="https://www.youtube-nocookie.com/embed/${id}" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></figure><p><br></p>`);
  };

  const openLib = async () => {
    if (!listMedia) return;
    saveSel();
    setLibBusy(true); setLib([]);
    try { setLib(await listMedia()); } catch { setLib([]); } finally { setLibBusy(false); }
  };
  const pick = (m: MediaItem) => {
    setLib(null);
    restoreSel();
    insertHtml(`<figure><img src="${esc(m.url)}" alt=""></figure><p><br></p>`);
  };

  const toggleSrc = () => {
    if (!src) { setSrcText(ref.current?.innerHTML || ''); setSrc(true); return; }
    if (ref.current) ref.current.innerHTML = srcText;
    last.current = srcText; onChange(srcText);
    savedRange.current = null; // body was rebuilt; next insert goes to the end
    setSrc(false);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(e.clipboardData.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); insertFiles(files); return; }
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (!html && !text) return;
    e.preventDefault();
    insertHtml(html ? clean(html) : textToHtml(text));
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    insertFiles(files);
  };

  const words = plain(value).split(/\s+/).filter(Boolean).length;

  return (
    <div className={`rte ${busy ? 'busy' : ''}`}>
      <div className="rte-bar" role="toolbar" aria-label="تنسيق النص">
        <div className="grp">
          <TB on={state.block === 'h2'} title="عنوان فرعي" onClick={() => block('h2')}>عنوان</TB>
          <TB on={state.block === 'h3'} title="عنوان أصغر" onClick={() => block('h3')}>عنوان ٢</TB>
          <TB on={state.block === 'blockquote'} title="اقتباس" onClick={() => block('blockquote')}>❝ اقتباس</TB>
        </div>
        <div className="grp">
          <TB on={state.b} title="غامق (Ctrl+B)" onClick={() => exec('bold')}><b>B</b></TB>
          <TB on={state.i} title="مائل (Ctrl+I)" onClick={() => exec('italic')}><i>I</i></TB>
          <TB on={state.u} title="تسطير (Ctrl+U)" onClick={() => exec('underline')}><u>U</u></TB>
          <TB title="يتوسطه خط" onClick={() => exec('strikeThrough')}><s>S</s></TB>
        </div>
        <div className="grp">
          <TB title="قائمة نقطية" onClick={() => exec('insertUnorderedList')}>• قائمة</TB>
          <TB title="قائمة مرقمة" onClick={() => exec('insertOrderedList')}>١. قائمة</TB>
          <TB title="خط فاصل" onClick={() => exec('insertHorizontalRule')}>— فاصل</TB>
        </div>
        <div className="grp">
          <TB title="إدراج رابط" onClick={addLink}>🔗 رابط</TB>
          <TB title="إزالة الرابط" onClick={() => exec('unlink')}>إزالة الرابط</TB>
        </div>
        <div className="grp">
          <TB title="رفع صورة من جهازك" onClick={() => fileRef.current?.click()}>🖼 صورة</TB>
          {listMedia && <TB title="اختيار صورة مرفوعة سابقاً" onClick={openLib}>المكتبة</TB>}
          <TB title="تضمين فيديو يوتيوب" onClick={addVideo}>▶ فيديو</TB>
        </div>
        <div className="grp">
          <TB title="مسح التنسيق" onClick={() => exec('removeFormat')}>مسح التنسيق</TB>
          <TB title="تراجع" onClick={() => exec('undo')}>↶</TB>
          <TB title="إعادة" onClick={() => exec('redo')}>↷</TB>
          <TB on={src} title="تحرير HTML مباشرة" onClick={toggleSrc}>HTML</TB>
        </div>
        {busy > 0 && <span className="rte-up">جاري رفع الصورة…</span>}
      </div>

      <div
        ref={ref}
        className="rte-body"
        contentEditable={!src}
        suppressContentEditableWarning
        dir="rtl"
        data-placeholder={placeholder}
        style={{ display: src ? 'none' : undefined }}
        onInput={emit}
        onBlur={emit}
        onPaste={onPaste}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onKeyUp={refresh}
        onMouseUp={refresh}
      />
      {src && <textarea className="rte-src" dir="ltr" value={srcText} onChange={(e) => setSrcText(e.target.value)} spellCheck={false} />}

      <div className="rte-foot"><span>{words} كلمة</span><span>·</span><span>{Math.max(1, Math.round(words / 180))} دقائق قراءة</span></div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => { insertFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
      />

      {lib !== null && (
        <div className="rte-modal" onClick={() => setLib(null)} role="dialog" aria-label="مكتبة الصور">
          <div className="rte-lib" onClick={(e) => e.stopPropagation()}>
            <header><b>مكتبة الصور</b><button type="button" onClick={() => setLib(null)} aria-label="إغلاق">✕</button></header>
            {libBusy ? <p className="adm-loading">جاري التحميل…</p>
              : lib.length === 0 ? <p className="adm-empty">لا توجد صور مرفوعة بعد.</p>
              : <div className="grid">{lib.map((m) => <button type="button" key={m.url} onClick={() => pick(m)} title={m.name}><img src={imgAt(m.url, 320)} alt="" loading="lazy" /></button>)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
