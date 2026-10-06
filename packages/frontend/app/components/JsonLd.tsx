import { ldJson } from '../lib/seo';

/** Server-rendered structured data block (see app/lib/seo.ts). */
export default function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(data) }} />;
}
