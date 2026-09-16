import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const articles = [
  {
    title: 'الحكومة تطلق برنامج تطوير البنية التحتية بـ 500 مليون دينار',
    content: 'أعلنت الحكومة الأردنية عن برنامج طموح لتطوير البنية التحتية بقيمة 500 مليون دينار، يستهدف تحسين الطرق والمياه والكهرباء في جميع محافظات المملكة.',
    summary: 'برنامج حكومي جديد بـ 500 مليون دينار لتطوير البنية التحتية',
    category: 'سياسية',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-15'),
    viewsCount: 2450,
  },
  {
    title: 'البنك المركزي يرفع سعر الفائدة إلى 6.5%',
    content: 'قررت لجنة السياسة النقدية بالبنك المركزي الأردني رفع سعر الفائدة الأساسي بمقدار 0.5% ليصل إلى 6.5% اعتباراً من الأسبوع القادم.',
    summary: 'البنك المركزي يرفع معدل الفائدة الأساسي',
    category: 'اقتصاد',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-14'),
    viewsCount: 1890,
  },
  {
    title: 'الأردن تتأهل لنهائيات كأس آسيا لكرة القدم',
    content: 'حققت المنتخب الأردني فوزاً تاريخياً على المنتخب الإيراني بنتيجة 2-1 في مباراة الدور ربع النهائي، مما ضمن تأهله إلى نهائيات كأس آسيا.',
    summary: 'فوز تاريخي للأردن على إيران بـ 2-1',
    category: 'رياضة',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-13'),
    viewsCount: 3200,
  },
  {
    title: 'الجامعة الأردنية تطلق برنامج ماجستير في الذكاء الاصطناعي',
    content: 'أعلنت الجامعة الأردنية عن إطلاق برنامج دراسات عليا متخصص في الذكاء الاصطناعي والتعلم الآلي، بهدف تدريب الكوادر الأردنية على أحدث التقنيات.',
    summary: 'برنامج ماجستير جديد في الذكاء الاصطناعي',
    category: 'تكنولوجيا',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-12'),
    viewsCount: 1650,
  },
  {
    title: 'مهرجان صخراء وادي رم يستقطب آلاف السياح',
    content: 'اجتذب مهرجان صخراء وادي رم السنوي أكثر من 25 ألف سائح من داخل وخارج الأردن، مما يعكس أهمية السياحة الثقافية في الاقتصاد الأردني.',
    summary: 'مهرجان وادي رم يستقطب 25 ألف سائح',
    category: 'ثقافة',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-11'),
    viewsCount: 1420,
  },
  {
    title: 'اجتماع عربي في عمّان يناقش الأزمة السورية',
    content: 'عقد اجتماع وزاري عربي في العاصمة عمّان لمناقشة التطورات الأخيرة في الأزمة السورية وسبل إعادة الإعمار والاستقرار الإقليمي.',
    summary: 'اجتماع عربي في عمّان بشأن الأزمة السورية',
    category: 'عالم',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-10'),
    viewsCount: 2100,
  },
  {
    title: 'ارتفاع أسعار الذهب يحفز الاستثمار في السلع النفيسة',
    content: 'شهد السوق الأردنية للذهب ارتفاعاً كبيراً في الطلب بعد ارتفاع الأسعار العالمية، مما دفع المستثمرين للاهتمام بالسلع النفيسة كتحوط ضد التضخم.',
    summary: 'ارتفاع الطلب على الذهب في الأردن',
    category: 'اقتصاد',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-09'),
    viewsCount: 1750,
  },
  {
    title: 'فريق عمّان يفوز بدوري كرة الطائرة',
    content: 'حقق فريق عمّان الرياضي بطولة الدوري الممتاز لكرة الطائرة بعد فوزه على فريق الزرقاء في المباراة النهائية بنتيجة 3-2.',
    summary: 'فريق عمّان يحقق بطولة الدوري الممتاز للطائرة',
    category: 'رياضة',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-08'),
    viewsCount: 890,
  },
  {
    title: 'افتتاح مركز البحوث العلمية الجديد في جامعة اليرموك',
    content: 'احتفلت جامعة اليرموك باستقلال مركز البحوث العلمية الجديد، الذي يضم أحدث المختبرات ومعدات البحث العلمي في الشرق الأوسط.',
    summary: 'افتتاح مركز بحوث جديد في اليرموك',
    category: 'تعليم',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-07'),
    viewsCount: 1200,
  },
  {
    title: 'مبادرة أردنية لمكافحة تغير المناخ تنال جوائز دولية',
    content: 'حصلت مبادرة أردنية بيئية على جوائز دولية متعددة لجهودها في مكافحة تغير المناخ والحفاظ على التنوع البيولوجي في المملكة.',
    summary: 'مبادرة أردنية بيئية تنال جوائز دولية',
    category: 'بيئة',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-06'),
    viewsCount: 1580,
  },
  {
    title: 'شركة تقنية أردنية تطلق تطبيق جديد للتجارة الإلكترونية',
    content: 'أطلقت شركة تقنية أردنية تطبيقاً جديداً للتجارة الإلكترونية يوفر خدمات متقدمة للمتاجر الصغيرة والمتوسطة للبيع عبر الإنترنت.',
    summary: 'تطبيق جديد للتجارة الإلكترونية من شركة أردنية',
    category: 'تكنولوجيا',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-05'),
    viewsCount: 1340,
  },
  {
    title: 'زيارة وفد اقتصادي من الصين إلى الأردن',
    content: 'استقبلت وزارة الاستثمار وفداً اقتصادياً صينياً رفيع المستوى لبحث فرص التعاون الاقتصادي والاستثماري بين البلدين.',
    summary: 'وفد صيني يزور الأردن لبحث الفرص الاستثمارية',
    category: 'عالم',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-04'),
    viewsCount: 1100,
  },
  {
    title: 'إنجاز معماري: افتتاح برج عمّان الجديد',
    content: 'تم افتتاح برج عمّان الجديد، أحد أطول الأبراج في المنطقة، والذي يضم مكاتب وفنادق ومراكز تجارية بمعايير عالمية.',
    summary: 'افتتاح برج عمّان الجديد كمعلم معماري مميز',
    category: 'سياسية',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-03'),
    viewsCount: 2200,
  },
  {
    title: 'حفل موسيقار أردني عالمي ينجح في دبي',
    content: 'حقق الموسيقار الأردني الشهير نجاحاً كبيراً بتقديم حفل موسيقي في دبي حضره أكثر من 15 ألف موسيقار عربي.',
    summary: 'موسيقار أردني ينجح في حفل موسيقي بدبي',
    category: 'ثقافة',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-02'),
    viewsCount: 980,
  },
  {
    title: 'جامعة عمّان الأهلية تحتل مرتبة متقدمة عالمياً',
    content: 'احتلت جامعة عمّان الأهلية المرتبة 450 عالمياً في تصنيفات الجامعات العالمية، مما يعكس تطورها الأكاديمي المستمر.',
    summary: 'جامعة عمّان الأهلية تحتل مرتبة متقدمة عالمياً',
    category: 'تعليم',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-01'),
    viewsCount: 1450,
  },
  {
    title: 'مشروع شمسي جديد يوفر كهرباء نظيفة لـ 50 ألف أسرة',
    content: 'دشنت الحكومة الأردنية مشروع محطة طاقة شمسية جديدة بطاقة 200 ميجاوات، والذي سيوفر كهرباء نظيفة لـ 50 ألف أسرة أردنية.',
    summary: 'مشروع شمسي جديد بـ 200 ميجاوات',
    category: 'اقتصاد',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-08-31'),
    viewsCount: 1620,
  },
  {
    title: 'فريق البحث الأردني يكتشف نوعاً نادراً من المعادن',
    content: 'اكتشف فريق بحث أردني متخصص نوعاً نادراً من المعادن الثمينة في منطقة جنوب الأردن، مما قد يساهم في الاقتصاد الوطني.',
    summary: 'اكتشاف نوع نادر من المعادن في جنوب الأردن',
    category: 'تكنولوجيا',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-08-30'),
    viewsCount: 1310,
  },
  {
    title: 'برنامج حكومي لدعم الشباب رواد الأعمال',
    content: 'أطلقت وزارة الشباب برنامجاً حكومياً جديداً يوفر تمويلاً وتدريباً لدعم الشباب رواد الأعمال وإطلاق مشاريعهم الناشئة.',
    summary: 'برنامج حكومي لدعم الشباب رواد الأعمال',
    category: 'اقتصاد',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-08-29'),
    viewsCount: 1780,
  },
  {
    title: 'منتخب الأردن يستعد لتصفيات كأس العالم',
    content: 'بدأ منتخب الأردن لكرة القدم الاستعداد المكثف لتصفيات كأس العالم 2026، مع تعيين مدرب جديد بخبرة دولية.',
    summary: 'المنتخب الأردني يستعد لتصفيات كأس العالم',
    category: 'رياضة',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-08-28'),
    viewsCount: 2800,
  },
];

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Clear existing articles
    await prisma.article.deleteMany({});
    console.log('🗑️ Cleared existing articles');

    // Create or get admin author
    let author = await prisma.user.findFirst({ where: { email: 'admin@mutabe3.news' } });
    if (!author) {
      author = await prisma.user.create({
        data: {
          email: 'admin@mutabe3.news',
          password: 'seed-admin-temporary',
          name: 'مسؤول',
        },
      });
    }
    console.log('✅ Author ready:', author.id);

    // Insert articles
    for (const article of articles) {
      // Generate slug from title
      const slug = article.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 100);

      await prisma.article.create({
        data: {
          title: article.title,
          slug: slug,
          content: article.content,
          summary: article.summary,
          status: article.status as any,
          publishedAt: article.publishedAt,
          viewsCount: article.viewsCount,
          author: { connect: { id: author.id } },
          category: {
            connectOrCreate: {
              where: { name: article.category },
              create: {
                name: article.category,
                slug: article.category.toLowerCase(),
              },
            },
          },
        },
      });
    }

    console.log(`✅ Seeded ${articles.length} articles successfully`);
    console.log('✅ Database seed complete!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
