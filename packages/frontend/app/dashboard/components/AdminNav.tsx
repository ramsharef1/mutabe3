'use client';

import { usePathname } from 'next/navigation';
import { Me, ROLE_AR, isEditorRole, logout } from './staff';

// Shared dashboard header: sections the signed-in role may open (D-043 Stage 3).
export default function AdminNav({ me }: { me: Me | null }) {
  const path = usePathname() || '';
  const links = [
    { href: '/dashboard', label: 'المقالات', show: true },
    { href: '/dashboard/homepage', label: 'الصفحة الرئيسية', show: isEditorRole(me?.role) },
    { href: '/dashboard/categories', label: 'الأقسام', show: isEditorRole(me?.role) },
    { href: '/dashboard/users', label: 'المستخدمون', show: me?.role === 'ADMIN' },
    { href: '/dashboard/account', label: 'كلمة المرور', show: !!me },
  ].filter((l) => l.show);
  return (
    <header className="adm-top">
      <div className="adm-brand"><b>المتابع</b><span>لوحة التحكم</span></div>
      <nav className="adm-nav" aria-label="أقسام لوحة التحكم">
        {links.map((l) => {
          const on = l.href === '/dashboard' ? path === '/dashboard' : path.startsWith(l.href);
          return <a key={l.href} href={l.href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>{l.label}</a>;
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
