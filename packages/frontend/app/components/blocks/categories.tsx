'use client';

import Link from 'next/link';

const CATEGORIES = [
  { name: 'اقتصاد', slug: 'economy' },
  { name: 'سياسة', slug: 'politics' },
  { name: 'رياضة', slug: 'sports' },
  { name: 'تكنولوجيا', slug: 'tech' },
  { name: 'العالم', slug: 'world' },
  { name: 'فلسطين', slug: 'palestine' },
  { name: 'تعليم', slug: 'education' },
  { name: 'صحة', slug: 'health' },
];

export function CategoryQuickNav() {
  return (
    <div className="catquick">
      <div className="pills">
        {CATEGORIES.map((cat) => (
          <Link key={cat.slug} href={`/category/${cat.slug}`} className="pill">
            {cat.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
