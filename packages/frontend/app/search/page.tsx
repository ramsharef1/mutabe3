import type { Metadata } from 'next';
import SearchView from './SearchView';

// Server shell for the search page (F-05b): a title that names the query, a canonical without it,
// and noindex — internal result pages never belong in a search engine's index. The form and
// results stay in the client SearchView.
export const dynamic = 'force-dynamic';

type Props = { searchParams: { q?: string | string[] } };

const qOf = (sp: Props['searchParams']) => String((Array.isArray(sp.q) ? sp.q[0] : sp.q) || '').replace(/\s+/g, ' ').trim().slice(0, 80);

export function generateMetadata({ searchParams }: Props): Metadata {
  const q = qOf(searchParams || {});
  return {
    title: q ? `بحث: «${q}» | المتابع` : 'بحث | المتابع',
    description: q ? `نتائج البحث عن «${q}» في موقع المتابع الاخباري.` : 'ابحث في أخبار وتقارير موقع المتابع الاخباري.',
    alternates: { canonical: '/search' },
    robots: { index: false, follow: true },
  };
}

export default function SearchPage() {
  return <SearchView />;
}
