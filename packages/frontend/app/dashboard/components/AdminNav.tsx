'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Me, ROLE_AR, isEditorRole, logout, adminFetch } from './staff';

// Shared dashboard header: sections the signed-in role may open (D-043 Stages 3–4).
export default function AdminNav({ me }: { me: Me | null }) {
  const path = usePathname() || '';
  const editor = isEditorRole(me?.role);
  const [pending, setPending] = useState(0);
  useEffect(() => {
    if (!editor) return;
    adminFetch('/api/admin/comments/counts').then((r) => (r.ok ? r.json() : null)).then((j) => j && setPending(j.data?.PENDING || 0)).catch(() => {});
  }, [editor, path]);
  const links = [
    { href: '/dashboard', label: 'المقالات', show: true },
    { href: '/dashboard/comments', label: 'التعليقات', badge: pending, show: editor },
    { href: '/dashboard/homepage', label: 'الصفحة الرئيسية', show: editor },
    { href: '/dashboard/polls', label: 'الاستطلاعات', show: editor },
    { href: '/dashboard/newsletter', label: 'النشرة', show: editor },
    { href: '/dashboard/categories', label: 'الأقسام', show: editor },
    { href: '/dashboard/users', label: 'المستخدمون', show: me?.role === 'ADMIN' },
    { href: '/dashboard/ads', label: 'الإعلانات', show: me?.role === 'ADMIN' },
    { href: '/dashboard/account', label: 'كلمة المرور', show: !!me },
  ].filter((l) => l.show);
  return (
    <header className="adm-top">
      <div className="adm-brand"><b>المتابع</b><span>لوحة التحكم</span></div>
      <nav className="adm-nav" aria-label="أقسام لوحة التحكم">
        {links.map((l) => {
          const on = l.href === '/dashboard' ? path === '/dashboard' : path.startsWith(l.href);
          return (
            <a key={l.href} href={l.href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
              {l.label}{l.badge ? <span className="adm-count" aria-label={`${l.badge} بانتظار المراجعة`}>{l.badge}</span> : null}
            </a>
          );
        })}
      </nav>
      <div className="adm-actions">
        <a className="adm-link" href="/" target="_blank" rel="noopener">عرض الموقع ↗</a>
        {me && <span className="adm-user">{me.name} · {ROLE_AR[me.role] || me.role}</span>}
        <button type="button" className="adm-logout" onClick={logout}>خروج</button>
      </div>
    </header>
  );
}

export const Denied = () => (
  <main className="adm-main"><div className="adm-err">ليس لديك صلاحية الوصول إلى هذه الصفحة.</div><a className="adm-link" href="/dashboard">‹ العودة إلى المقالات</a></main>
);
