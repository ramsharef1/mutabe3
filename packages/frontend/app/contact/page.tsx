import type { Metadata } from 'next';
import { StaticPage } from '../components/StaticPage';

export const metadata: Metadata = {
  title: 'اتصل بنا | موقع المتابع الاخباري',
  description: 'عناوين التواصل مع تحرير موقع المتابع الاخباري وقسم الإعلانات وطلبات التصحيح والخصوصية.',
  alternates: { canonical: '/contact' },
};

export default function Contact() {
  return (
    <StaticPage title="اتصل بنا" intro="نرحّب بأخباركم وملاحظاتكم وطلبات التصحيح. صناديق البريد التالية قيد التفعيل؛ تُنشر أرقام الهاتف وعنوان المكتب مع بيانات الترخيص." counsel>
      <table>
        <tbody>
          <tr><th>التحرير والأخبار</th><td dir="ltr">editor@mutabe3.news</td></tr>
          <tr><th>الإعلانات والرعاية</th><td dir="ltr">ads@mutabe3.news</td></tr>
          <tr><th>التصحيح وحق الرد</th><td dir="ltr">corrections@mutabe3.news</td></tr>
          <tr><th>الخصوصية وحقوق البيانات</th><td dir="ltr">privacy@mutabe3.news</td></tr>
          <tr><th>رئيس التحرير / المدير المسؤول</th><td>عدي عليان — عبر بريد التحرير أعلاه</td></tr>
        </tbody>
      </table>

      <h2 id="tip">أرسل خبراً</h2>
      <p>أرسل الخبر أو الصورة أو المقطع إلى بريد التحرير مع اسمك ورقم هاتفك ومكان الحدث وزمانه. لا ننشر مواد من مصادر مجهولة دون تحقق، ولا نكشف هوية المصدر إذا طلب ذلك. بإرسالك مادة مصوّرة تؤكد أنك صاحب حقّها أو مخوَّل بنشرها.</p>

      <h2>طلب تصحيح أو حق ردّ</h2>
      <p>اذكر رابط المادة والفقرة المعنيّة وما تراه خطأً، وسنردّ خلال المدة المبيّنة في <a href="/corrections">صفحة التصحيح وحق الرد</a>.</p>

      <h2>طلبات الخصوصية</h2>
      <p>للاطلاع على بياناتك أو تصحيحها أو حذفها أو سحب موافقتك، راسل بريد الخصوصية؛ التفاصيل في <a href="/privacy">سياسة الخصوصية</a>.</p>
    </StaticPage>
  );
}
