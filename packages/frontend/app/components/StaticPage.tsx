import { SiteHeader, SiteFooter, Crumbs } from './site';

// Shell for the site's informational and legal pages (BIBLE F-01 / D-053): header, breadcrumb,
// a single prose column and the footer. `counsel` shows the draft banner required by
// brain/LEGAL/README.md until the client's counsel clears the text.
export const LAST_REVIEWED = '2026-10-07';

export function CounselBanner() {
  return (
    <div className="counsel" role="note">
      <b>مسودة قيد المراجعة القانونية.</b> تُنشر هذه الصفحة بصيغتها النهائية بعد اعتماد المستشار القانوني للموقع؛ العبارات بين قوسين معقوفين [ ] تُستكمل عند اكتمال بيانات الترخيص. آخر تحديث: {LAST_REVIEWED}.
    </div>
  );
}

export function StaticPage({ title, intro, counsel = false, children }: { title: string; intro?: string; counsel?: boolean; children: React.ReactNode }) {
  return (
    <div className="am">
      <SiteHeader />
      <div className="wrap">
        <Crumbs items={[{ label: title }]} />
        <article className="static">
          {counsel && <CounselBanner />}
          <h1>{title}</h1>
          {intro && <p className="lead">{intro}</p>}
          {children}
        </article>
      </div>
      <SiteFooter />
    </div>
  );
}
