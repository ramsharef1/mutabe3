'use client';

import { useParams } from 'next/navigation';
import { Img, useArticles, Loading, SiteHeader, SiteFooter, Sidebar, SecHd, fmtDate } from '../../components/site';

const FILLER = [
  'وأكد المتحدث الرسمي أن الخطوات التنفيذية ستبدأ خلال الأسابيع المقبلة، مشيراً إلى أن الجهات المعنية أنهت الدراسات الفنية والمالية اللازمة، وأن العمل يجري بالتنسيق مع مختلف الشركاء لضمان تحقيق الأهداف المرسومة ضمن الجدول الزمني المحدد.',
  'وفي السياق ذاته، أشار خبراء إلى أن هذه التطورات تأتي في وقت تشهد فيه المملكة حراكاً واسعاً على أكثر من صعيد، ما يستدعي متابعة دقيقة للنتائج على المدى القريب والمتوسط، ودراسة انعكاساتها على المواطن والاقتصاد الوطني بشكل عام.',
  'ومن المتوقع أن تعلن الجهات المختصة عن مزيد من التفاصيل خلال مؤتمر صحفي يعقد الأسبوع المقبل، يتناول آليات التنفيذ ومصادر التمويل والجدول الزمني للمراحل اللاحقة، إضافة إلى الإجابة عن استفسارات وسائل الإعلام المحلية والعربية.',
];

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { articles, loading } = useArticles();
  if (loading) return <Loading />;

  const a = articles.find((x) => x.id === id || x.slug === id);
  if (!a) {
    return (
      <div className="am">
        <SiteHeader />
        <div className="wrap loading">المقال غير موجود</div>
        <SiteFooter />
      </div>
    );
  }

  const catSlug = a.category?.slug || 'politics';
  let related = articles.filter((x) => x.id !== a.id && x.category?.slug === a.category?.slug);
  if (related.length < 4) related = articles.filter((x) => x.id !== a.id);
  related = related.slice(0, 6);
  const paras = [a.content, ...FILLER];

  return (
    <div className="am">
      <SiteHeader />
      <div className="wrap">
        <div className="inner">
          <div className="mainc">
            <div className="catbar"><a href={`/category/${catSlug}`}>{a.category?.name || 'أخبار'}</a></div>

            <div className="arttop">
              <h1>{a.title}</h1>
              <div className="share">
                <i title="طباعة" /><i title="تعليق" /><i title="تكبير" /><i title="تصغير" />
                <span className="cnt">0</span><span className="tw">Tweet</span>
                <span className="cnt">{Math.max(1, Math.round((a.viewsCount || 0) / 300))}</span><span className="fb">Share</span>
              </div>
            </div>
            <div className="artdate">{fmtDate(a.publishedAt)}</div>

            <div className="artbody">
              <div className="lead"><Img src={a.featuredImageUrl} /></div>
              {paras.map((p, i) => <p key={i}>{p}</p>)}
            </div>

            <div className="artsrc">المتابع - {a.category?.name} | {a.viewsCount ?? 0} مشاهدة</div>

            <div className="sec">
              <SecHd t="أخبار ذات صلة" slug={catSlug} />
              <ul className="arr">{related.map((r) => <li key={r.id}><a href={`/article/${r.id}`}>{r.title}</a></li>)}</ul>
            </div>

            <div className="comments">
              <h4>أضف تعليقك</h4>
              <input placeholder="الاسم" />
              <input placeholder="البريد الإلكتروني" />
              <textarea placeholder="التعليق" />
              <div className="cap">رمز التحقق</div>
              <button>إرسال</button>
            </div>
          </div>

          <Sidebar articles={articles} />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
