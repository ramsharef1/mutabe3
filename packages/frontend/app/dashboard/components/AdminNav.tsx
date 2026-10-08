'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Me, ROLE_AR, isEditorRole, logout, adminFetch } from './staff';

// Dashboard sidebar (D-043 Stages 3–4; sidebar since D-084): the sections the signed-in role may open,
// grouped, on the start (right) side. Pages keep their `<div className="adm"><AdminNav/><main className="adm-main">`
// shape — the grid switches on in CSS only when this sidebar is present, so the editor and the preview,
// which use the old `.adm-top` bar with a back link, are unchanged. Below 900px it folds into a top bar
// with a «القائمة» button. On desktop it collapses to a slim rail; the choice is remembered per browser
// (localStorage `admSide`, restored before paint by dashboard/layout.tsx via <html data-adm-side>).
type Link = { href: string; label: string; show: boolean; badge?: number };

const SIDE_KEY = 'admSide';
const PanelIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
    <line x1="12.5" y1="3.5" x2="12.5" y2="16.5" />
  </svg>
);

export default function AdminNav({ me }: { me: Me | null }) {
  const path = usePathname() || '';
  const editor = isEditorRole(me?.role);
  const admin = me?.role === 'ADMIN';
  const [pending, setPending] = useState(0);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // The layout's pre-paint script already set the attribute; mirror it into state once mounted.
  useEffect(() => { setCollapsed(document.documentElement.getAttribute('data-adm-side') === 'collapsed'); }, []);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (next) document.documentElement.setAttribute('data-adm-side', 'collapsed');
    else document.documentElement.removeAttribute('data-adm-side');
    try { localStorage.setItem(SIDE_KEY, next ? 'collapsed' : 'open'); } catch { /* private mode: still works for this page */ }
  };
  useEffect(() => {
    if (!editor) return;
    adminFetch('/api/admin/comments/counts').then((r) => (r.ok ? r.json() : null)).then((j) => j && setPending(j.data?.PENDING || 0)).catch(() => {});
  }, [editor, path]);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const groups: { title: string; links: Link[] }[] = [
    {
      title: 'المحتوى',
      links: [
        { href: '/dashboard', label: 'المقالات', show: true },
        { href: '/dashboard/comments', label: 'التعليقات', badge: pending, show: editor },
        { href: '/dashboard/homepage', label: 'الصفحة الرئيسية', show: editor },
        { href: '/dashboard/data', label: 'البيانات', show: editor },
        { href: '/dashboard/categories', label: 'الأقسام', show: editor },
        { href: '/dashboard/polls', label: 'الاستطلاعات', show: editor },
      ],
    },
    {
      title: 'القرّاء',
      links: [
        { href: '/dashboard/newsletter', label: 'النشرة', show: editor },
        { href: '/dashboard/push', label: 'التنبيهات', show: editor },
        { href: '/dashboard/stats', label: 'الإحصاءات', show: editor },
      ],
    },
    {
      title: 'الإدارة',
      links: [
        { href: '/dashboard/users', label: 'المستخدمون', show: admin },
        { href: '/dashboard/ads', label: 'الإعلانات', show: admin },
        { href: '/dashboard/audit', label: 'سجل التدقيق', show: admin },
      ],
    },
    {
      title: 'حسابي',
      links: [{ href: '/dashboard/account', label: 'ملفي وكلمة المرور', show: !!me }],
    },
  ]
    .map((g) => ({ ...g, links: g.links.filter((l) => l.show) }))
    .filter((g) => g.links.length);

  const isOn = (href: string) => (href === '/dashboard' ? path === '/dashboard' : path === href || path.startsWith(`${href}/`));

  return (
    <aside className={`adm-side${open ? ' open' : ''}`}>
      <div className="adm-side-head">
        <a className="adm-brand" href="/dashboard"><b>المتابع</b><span>لوحة التحكم</span></a>
        <button
          type="button"
          className="adm-side-collapse"
          aria-expanded={!collapsed}
          aria-controls="adm-side-menu"
          aria-label={collapsed ? `إظهار القائمة الجانبية${pending ? ` — ${pending} تعليق بانتظار المراجعة` : ''}` : 'طيّ القائمة الجانبية'}
          title={collapsed ? 'إظهار القائمة' : 'طيّ القائمة'}
          onClick={toggleCollapsed}
        >
          <PanelIcon />
          {collapsed && pending ? <span className="adm-side-dot" aria-hidden="true">{pending}</span> : null}
        </button>
        <button
          type="button"
          className="adm-side-toggle"
          aria-expanded={open}
          aria-controls="adm-side-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '✕ إغلاق' : '☰ القائمة'}
        </button>
      </div>
      <div className="adm-side-menu" id="adm-side-menu">
        <nav className="adm-side-nav" aria-label="أقسام لوحة التحكم">
          {groups.map((g) => (
            <div className="adm-side-group" key={g.title}>
              <div className="adm-side-title">{g.title}</div>
              {g.links.map((l) => {
                const on = isOn(l.href);
                return (
                  <a key={l.href} href={l.href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
                    <span>{l.label}</span>
                    {l.badge ? <span className="adm-count" aria-label={`${l.badge} بانتظار المراجعة`}>{l.badge}</span> : null}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="adm-side-foot">
          {me && <span className="adm-user">{me.name}<small>{ROLE_AR[me.role] || me.role}</small></span>}
          <a className="adm-link" href="/" target="_blank" rel="noopener">عرض الموقع ↗</a>
          <button type="button" className="adm-logout" onClick={logout}>خروج</button>
        </div>
      </div>
    </aside>
  );
}

export const Denied = () => (
  <main className="adm-main"><div className="adm-err">ليس لديك صلاحية الوصول إلى هذه الصفحة.</div><a className="adm-link" href="/dashboard">‹ العودة إلى المقالات</a></main>
);
