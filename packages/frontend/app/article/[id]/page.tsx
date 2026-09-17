'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Img, useArticles, Loading, SiteHeader, SiteFooter, Sidebar, SecHd, fmtDate, ago, readMins, Crumbs, ShareRow, Chip, Ico, WRITERS, face, AdBanner } from '../../components/site';

const FILLER = [
  'وأكد المتحدث الرسمي أن الخطوات التنفيذية ستبدأ خلال الأسابيع المقبلة، مشيراً إلى أن الجهات المعنية أنهت الدراسات الفنية والمالية اللازمة، وأن العمل يجري بالتنسيق مع مختلف الشركاء لضمان تحقيق الأهداف المرسومة ضمن الجدول الزمني المحدد.',
  'وفي السياق ذاته، أشار خبراء إلى أن هذه التطورات تأتي في وقت تشهد فيه المملكة حراكاً واسعاً على أكثر من صعيد، ما يستدعي متابعة دقيقة للنتائج على المدى القريب والمتوسط، ودراسة انعكاساتها على المواطن والاقتصاد الوطني بشكل عام.',
  'ومن المتوقع أن تعلن الجهات المختصة عن مزيد من التفاصيل خلال مؤتمر صحفي يعقد الأسبوع المقبل، يتناول آليات التنفيذ ومصادر التمويل والجدول الزمني للمراحل اللاحقة، إضافة إلى الإجابة عن استفسارات وسائل الإعلام المحلية والعربية.',
];
const QUOTE = 'نعمل على أن تكون النتائج ملموسة للمواطن خلال الأشهر الستة المقبلة، وليس مجرد أرقام في تقرير.';
const TAGS = ['الأردن', 'عمّان', 'الحكومة', 'الاقتصاد الوطني', 'المتابع'];
const SAMPLE_COMMENTS = [
  { n: 'أبو محمد', t: 'منذ ساعتين', c: 'خطوة جيدة، نتمنى أن تنفذ على أرض الواقع وليس على الورق فقط.' },
  { n: 'سارة', t: 'منذ 40 دقيقة', c: 'المهم متابعة التنفيذ. شكراً للمتابع على التغطية.' },
];

function Progress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const f = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0);
    };
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return <div className="progress" style={{ width: `${p}%` }} />;
}

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { articles, loading } = useArticles();
  const [size, setSize] = useState(0); // -1 / 0 / 1 / 2 → font-size steps
  if (loading) return <Loading />;

  const idx = articles.findIndex((x) => x.id === id || x.slug === id);
  const a = articles[idx];
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
  const catName = a.category?.name || 'أخبار';
  let related = articles.filter((x) => x.id !== a.id && x.category?.slug === a.category?.slug);
  if (related.length < 4) related = articles.filter((x) => x.id !== a.id);
  const relCards = related.slice(0, 3);
  const relList = related.slice(3, 8);
  const alsoRead = related.slice(0, 2);
  const paras = [a.content, ...FILLER];
  const prev = articles[idx + 1];
  const next = articles[idx - 1];
  const wi = idx % WRITERS.length;
  const author = WRITERS[wi];
  const views = a.viewsCount ?? 0;

  return (
    <div className="am">
      <Progress />
      <SiteHeader />
      <div className="wrap">
        <div className="inner">
          <div className="mainc">
            <Crumbs items={[{ label: catName, href: `/category/${catSlug}` }, { label: a.title }]} />

            <div className="arthead">
              <Chip a={a} />
              <h1>{a.title}</h1>
              {a.summary && <p className="artsum">{a.summary}</p>}
              <div className="artmeta">
                <a className="au" href="/category/writers"><img src={face(wi)} alt="" /><span><b>{author}</b><small>المتابع - {catName}</small></span></a>
                <span title={fmtDate(a.publishedAt)}>{Ico.clock}{ago(a.publishedAt)}</span>
                <span>{Ico.eye}{views} مشاهدة</span>
                <span className="rt">{readMins(paras.join(' '))} دقائق قراءة</span>
                <span className="fs">
                  <button type="button" onClick={() => setSize((s) => Math.max(-1, s - 1))} title="تصغير الخط">أ-</button>
                  <button type="button" onClick={() => setSize((s) => Math.min(2, s + 1))} title="تكبير الخط">أ+</button>
                </span>
              </div>
              <ShareRow title={a.title} />
            </div>

            <figure className="artlead">
              <div className="im"><Img src={a.featuredImageUrl} /></div>
              <figcaption>{a.title} <em>— تصوير: المتابع</em></figcaption>
            </figure>

            <div className={`artbody fs${size}`}>
              {paras.map((p, i) => (
                <div key={i}>
                  <p>{p}</p>
                  {i === 0 && <blockquote className="pull">{QUOTE}</blockquote>}
                  {i === 1 && alsoRead.length > 0 && (
                    <aside className="also">
                      <b>اقرأ أيضاً</b>
                      <ul>{alsoRead.map((r) => <li key={r.id}><a href={`/article/${r.id}`}>{r.title}</a></li>)}</ul>
                    </aside>
                  )}
                </div>
              ))}
            </div>

            <div className="tags">
              <span>كلمات مفتاحية:</span>
              {TAGS.map((t) => <a key={t} href={`/category/${catSlug}`}>{t}</a>)}
            </div>

            <div className="artsrc">
              <span>المصدر: المتابع - {catName}</span>
              <ShareRow title={a.title} compact />
            </div>

            <div className="aubox">
              <img src={face(wi)} alt="" />
              <div>
                <b>{author}</b>
                <p>محرر في قسم {catName} بموقع المتابع الاخباري. يغطي الشأن المحلي والعربي منذ أكثر من عشر سنوات.</p>
                <a href="/category/writers">جميع مقالات الكاتب ›</a>
              </div>
            </div>

            <div className="prevnext">
              {prev ? <a className="pv" href={`/article/${prev.id}`}><small>{Ico.chev} الخبر السابق</small><span>{prev.title}</span></a> : <span />}
              {next ? <a className="nx" href={`/article/${next.id}`}><small>الخبر التالي {Ico.chev}</small><span>{next.title}</span></a> : <span />}
            </div>

            <AdBanner variant={3} className="adrow ad90" />

            <div className="sec">
              <SecHd t="أخبار ذات صلة" slug={catSlug} />
              <div className="cards cards3">
                {relCards.map((r) => (
                  <a key={r.id} className="card" href={`/article/${r.id}`}>
                    <div className="im"><Img src={r.featuredImageUrl} /><Chip a={r} /></div>
                    <div className="t">{r.title}</div>
                    <span className="tm">{ago(r.publishedAt)}</span>
                  </a>
                ))}
              </div>
              <ul className="arr" style={{ marginTop: 8 }}>{relList.map((r) => <li key={r.id}><a href={`/article/${r.id}`}>{r.title}</a></li>)}</ul>
            </div>

            <div className="comments">
              <h4>التعليقات <span>({SAMPLE_COMMENTS.length})</span></h4>
              <ul className="clist">
                {SAMPLE_COMMENTS.map((c, i) => (
                  <li key={i}><i>{c.n[0]}</i><div><b>{c.n}</b><small>{c.t}</small><p>{c.c}</p></div></li>
                ))}
              </ul>
              <h4>أضف تعليقك</h4>
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="row2"><input placeholder="الاسم" /><input placeholder="البريد الإلكتروني (لن يُنشر)" /></div>
                <textarea placeholder="اكتب تعليقك هنا..." />
                <div className="row2"><div className="cap">رمز التحقق</div><button>إرسال التعليق</button></div>
              </form>
              <small className="note">التعليقات المنشورة تعبر عن رأي أصحابها ولا تعبر عن رأي الموقع. يُحذف أي تعليق يتضمن إساءة أو تحريضاً.</small>
            </div>
          </div>

          <Sidebar articles={articles} />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
