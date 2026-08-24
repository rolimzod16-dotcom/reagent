/**
 * Curated REAGENT seed catalog (Stage 1).
 * Not scraped from reference sites. No prices. No invented certifications.
 * Representative products across medical/lab categories for architecture demo.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.inquiry.deleteMany();
  await prisma.productSpecification.deleteMany();
  await prisma.productDocument.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.manufacturer.deleteMany();
  await prisma.article.deleteMany();

  const manufacturers = await Promise.all(
    [
      {
        slug: "reagent-lab-line",
        name: "REAGENT Lab Line",
        descriptionRu:
          "Линейка лабораторных решений под брендом РЕАГЕНТ (партнёрские поставки).",
        descriptionEn:
          "Laboratory solutions line under the REAGENT brand (partner supply).",
      },
      {
        slug: "reagent-hospital",
        name: "REAGENT Hospital Systems",
        descriptionRu: "Оборудование для стационара и отделений интенсивной терапии.",
        descriptionEn: "Equipment for hospital wards and intensive care units.",
      },
      {
        slug: "reagent-imaging",
        name: "REAGENT Imaging",
        descriptionRu: "Решения для визуализации и лучевой диагностики.",
        descriptionEn: "Solutions for medical imaging and radiology.",
      },
    ].map((m) => prisma.manufacturer.create({ data: m }))
  );

  const m = Object.fromEntries(manufacturers.map((x) => [x.slug, x.id]));

  const catData = [
    {
      slug: "reagents",
      nameRu: "Реагенты",
      nameEn: "Reagents",
      descriptionRu: "Реагенты и наборы для лабораторной диагностики.",
      descriptionEn: "Reagents and kits for laboratory diagnostics.",
      sortOrder: 1,
    },
    {
      slug: "laboratory-equipment",
      nameRu: "Лабораторное оборудование",
      nameEn: "Laboratory Equipment",
      descriptionRu: "Оборудование для клинических и исследовательских лабораторий.",
      descriptionEn: "Equipment for clinical and research laboratories.",
      sortOrder: 2,
    },
    {
      slug: "medical-equipment",
      nameRu: "Медицинское оборудование",
      nameEn: "Medical Equipment",
      descriptionRu: "Оборудование для клиник и больниц.",
      descriptionEn: "Equipment for clinics and hospitals.",
      sortOrder: 3,
    },
    {
      slug: "consumables",
      nameRu: "Расходные материалы",
      nameEn: "Medical Consumables",
      descriptionRu: "Расходные материалы для лабораторий и отделений.",
      descriptionEn: "Consumables for laboratories and clinical departments.",
      sortOrder: 4,
    },
    {
      slug: "radiology",
      nameRu: "Радиология и рентген",
      nameEn: "Radiology & X-Ray",
      descriptionRu: "Оборудование лучевой диагностики.",
      descriptionEn: "Radiology and X-ray equipment.",
      sortOrder: 5,
    },
    {
      slug: "hospital-equipment",
      nameRu: "Больничное оборудование",
      nameEn: "Hospital Equipment",
      descriptionRu: "Койки, мебель и оснащение отделений.",
      descriptionEn: "Beds, furniture and ward equipment.",
      sortOrder: 6,
    },
    {
      slug: "diagnostics",
      nameRu: "Диагностическое оборудование",
      nameEn: "Diagnostic Equipment",
      descriptionRu: "Системы диагностики и мониторинга.",
      descriptionEn: "Diagnostic and monitoring systems.",
      sortOrder: 7,
    },
    {
      slug: "disinfection",
      nameRu: "Дезинфекция и стерилизация",
      nameEn: "Disinfection & Sterilization",
      descriptionRu: "Оборудование и средства для CSSD.",
      descriptionEn: "CSSD sterilization and disinfection equipment.",
      sortOrder: 8,
    },
    {
      slug: "cardiology",
      nameRu: "Кардиология",
      nameEn: "Cardiology",
      descriptionRu: "Оборудование кардиологического профиля.",
      descriptionEn: "Cardiology-related equipment.",
      sortOrder: 9,
    },
    {
      slug: "surgery",
      nameRu: "Хирургия / Оперблок",
      nameEn: "Surgery / OR",
      descriptionRu: "Оснащение операционных.",
      descriptionEn: "Operating room equipment.",
      sortOrder: 10,
    },
    {
      slug: "icu",
      nameRu: "ОРИТ / Реанимация",
      nameEn: "ICU / Critical Care",
      descriptionRu: "Оборудование отделений интенсивной терапии.",
      descriptionEn: "Intensive care unit equipment.",
      sortOrder: 11,
    },
  ];

  const categories = await Promise.all(
    catData.map((c) => prisma.category.create({ data: c }))
  );
  const c = Object.fromEntries(categories.map((x) => [x.slug, x.id]));

  type P = {
    slug: string;
    sku: string;
    model?: string;
    nameRu: string;
    nameEn: string;
    shortRu: string;
    shortEn: string;
    descriptionRu: string;
    descriptionEn: string;
    applicationsRu?: string;
    applicationsEn?: string;
    category: string;
    manufacturer: string;
    featured?: boolean;
    image: string;
    specs?: { labelRu: string; labelEn: string; valueRu: string; valueEn: string }[];
  };

  const products: P[] = [
    {
      slug: "biochem-reagent-kit-basic",
      sku: "RG-RGT-001",
      model: "BASIC-BIO",
      nameRu: "Набор реагентов для биохимических исследований (базовый)",
      nameEn: "Basic clinical chemistry reagent kit",
      shortRu: "Базовый набор реагентов для рутинной клинической биохимии.",
      shortEn: "Basic reagent kit for routine clinical chemistry.",
      descriptionRu:
        "Позиция каталога РЕАГЕНТ для B2B-запросов. Состав, совместимость с анализаторами и условия поставки уточняются при запросе цены. Публичные цены не указываются.",
      descriptionEn:
        "REAGENT catalog item for B2B inquiries. Composition, analyzer compatibility and supply terms are confirmed on quote request. No public pricing.",
      applicationsRu: "Клиническая лаборатория, биохимический анализ",
      applicationsEn: "Clinical laboratory, biochemistry testing",
      category: "reagents",
      manufacturer: "reagent-lab-line",
      featured: true,
      image:
        "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&q=80",
      specs: [
        { labelRu: "Тип", labelEn: "Type", valueRu: "Реагентный набор", valueEn: "Reagent kit" },
        { labelRu: "Область", labelEn: "Area", valueRu: "Биохимия", valueEn: "Biochemistry" },
      ],
    },
    {
      slug: "pcr-master-mix-general",
      sku: "RG-RGT-002",
      model: "PCR-MM",
      nameRu: "Мастер-микс для ПЦР (общий профиль)",
      nameEn: "General-purpose PCR master mix",
      shortRu: "Реагент для молекулярно-генетических исследований.",
      shortEn: "Reagent for molecular genetic workflows.",
      descriptionRu:
        "Каталожная позиция для запроса коммерческого предложения. Подробные инструкции и документы предоставляются после согласования поставки.",
      descriptionEn:
        "Catalog item for commercial quote. Detailed instructions and documents provided after supply agreement.",
      applicationsRu: "ПЦР-лаборатория",
      applicationsEn: "PCR laboratory",
      category: "reagents",
      manufacturer: "reagent-lab-line",
      featured: true,
      image:
        "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80",
    },
    {
      slug: "lab-centrifuge-benchtop",
      sku: "RG-LAB-010",
      model: "LC-200",
      nameRu: "Центрифуга лабораторная настольная",
      nameEn: "Benchtop laboratory centrifuge",
      shortRu: "Настольная центрифуга для клинических и исследовательских лабораторий.",
      shortEn: "Benchtop centrifuge for clinical and research labs.",
      descriptionRu:
        "Оборудование категории «лабораторное». Технические параметры и комплектация подтверждаются в коммерческом предложении.",
      descriptionEn:
        "Laboratory equipment category. Technical parameters and configuration confirmed in the commercial offer.",
      category: "laboratory-equipment",
      manufacturer: "reagent-lab-line",
      featured: true,
      image:
        "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=80",
      specs: [
        { labelRu: "Форм-фактор", labelEn: "Form factor", valueRu: "Настольный", valueEn: "Benchtop" },
      ],
    },
    {
      slug: "lab-analyzer-biochem",
      sku: "RG-LAB-020",
      model: "BA-100",
      nameRu: "Биохимический анализатор (лабораторный)",
      nameEn: "Clinical chemistry analyzer (laboratory)",
      shortRu: "Аналитическая система для лабораторий среднего потока.",
      shortEn: "Analytical system for mid-throughput laboratories.",
      descriptionRu:
        "Позиция для B2B-запроса. Совместимость, сервис и поставка реагентов обсуждаются индивидуально.",
      descriptionEn:
        "B2B inquiry item. Compatibility, service and reagent supply discussed case by case.",
      category: "laboratory-equipment",
      manufacturer: "reagent-lab-line",
      featured: true,
      image:
        "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&q=80",
    },
    {
      slug: "patient-monitor-multiparam",
      sku: "RG-MED-030",
      model: "PM-12",
      nameRu: "Монитор пациента мультипараметрический",
      nameEn: "Multiparameter patient monitor",
      shortRu: "Мониторинг жизненно важных показателей в отделении.",
      shortEn: "Vital signs monitoring for clinical departments.",
      descriptionRu:
        "Медицинское оборудование для стационара. Конфигурация модулей — по запросу.",
      descriptionEn:
        "Hospital medical equipment. Module configuration available on request.",
      category: "medical-equipment",
      manufacturer: "reagent-hospital",
      featured: true,
      image:
        "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&q=80",
    },
    {
      slug: "infusion-pump-standard",
      sku: "RG-MED-031",
      model: "IP-50",
      nameRu: "Инфузионный насос",
      nameEn: "Infusion pump",
      shortRu: "Насос для дозированной инфузии в клинической практике.",
      shortEn: "Pump for controlled clinical infusion.",
      descriptionRu: "Каталожная позиция. Параметры и обучение персонала — по запросу.",
      descriptionEn: "Catalog item. Parameters and staff training available on request.",
      category: "medical-equipment",
      manufacturer: "reagent-hospital",
      image:
        "https://images.unsplash.com/photo-1581595220892-b0739db3b8c5?w=800&q=80",
    },
    {
      slug: "vacutainer-tubes-set",
      sku: "RG-CON-040",
      nameRu: "Пробирки вакуумные (набор, расходники)",
      nameEn: "Vacuum blood collection tubes (set)",
      shortRu: "Расходные материалы для забора крови.",
      shortEn: "Consumables for blood collection.",
      descriptionRu:
        "Расходные материалы. Объёмы партий и варианты фасовки уточняются в заявке.",
      descriptionEn:
        "Consumables. Batch volumes and packaging options confirmed in the inquiry.",
      category: "consumables",
      manufacturer: "reagent-lab-line",
      image:
        "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&q=80",
    },
    {
      slug: "pipette-tips-rack",
      sku: "RG-CON-041",
      nameRu: "Наконечники для дозаторов (штатив)",
      nameEn: "Pipette tips (rack)",
      shortRu: "Лабораторные расходники для дозирования.",
      shortEn: "Laboratory consumables for pipetting.",
      descriptionRu: "Позиция расходных материалов. Спецификация по размерам — по запросу.",
      descriptionEn: "Consumable item. Size specification available on request.",
      category: "consumables",
      manufacturer: "reagent-lab-line",
      image:
        "https://images.unsplash.com/photo-1581093458791-9d42e1c5f1b2?w=800&q=80",
    },
    {
      slug: "mobile-xray-unit",
      sku: "RG-RAD-050",
      model: "MX-1",
      nameRu: "Мобильный рентгеновский аппарат",
      nameEn: "Mobile X-ray unit",
      shortRu: "Мобильная система для лучевой диагностики в стационаре.",
      shortEn: "Mobile system for in-hospital radiographic imaging.",
      descriptionRu:
        "Оборудование радиологии. Требования к помещению, монтажу и обучению — в коммерческом предложении.",
      descriptionEn:
        "Radiology equipment. Room, installation and training requirements in the commercial offer.",
      category: "radiology",
      manufacturer: "reagent-imaging",
      featured: true,
      image:
        "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&q=80",
    },
    {
      slug: "ultrasound-system-general",
      sku: "RG-RAD-051",
      model: "US-G",
      nameRu: "Ультразвуковая диагностическая система (общий профиль)",
      nameEn: "General ultrasound diagnostic system",
      shortRu: "УЗ-система для клинической диагностики.",
      shortEn: "Ultrasound system for clinical diagnostics.",
      descriptionRu: "Комплектация датчиков и ПО обсуждаются при запросе цены.",
      descriptionEn: "Probe configuration and software discussed on quote request.",
      category: "diagnostics",
      manufacturer: "reagent-imaging",
      featured: true,
      image:
        "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80",
    },
    {
      slug: "hospital-bed-electric",
      sku: "RG-HOS-060",
      model: "HB-E5",
      nameRu: "Кровать больничная электрическая",
      nameEn: "Electric hospital bed",
      shortRu: "Многофункциональная электрическая кровать для стационара.",
      shortEn: "Multifunction electric bed for hospital wards.",
      descriptionRu: "Больничное оборудование. Опции и аксессуары — по запросу.",
      descriptionEn: "Hospital equipment. Options and accessories on request.",
      category: "hospital-equipment",
      manufacturer: "reagent-hospital",
      image:
        "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80",
    },
    {
      slug: "or-surgical-light-led",
      sku: "RG-SUR-070",
      model: "OR-LED",
      nameRu: "Светильник хирургический бестеневой LED",
      nameEn: "LED shadowless surgical light",
      shortRu: "Освещение операционного поля.",
      shortEn: "Operating field illumination.",
      descriptionRu: "Оснащение оперблока. Варианты крепления — в спецификации поставки.",
      descriptionEn: "OR equipment. Mounting options defined in supply specification.",
      category: "surgery",
      manufacturer: "reagent-hospital",
      featured: true,
      image:
        "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800&q=80",
    },
    {
      slug: "operating-table-electrohydraulic",
      sku: "RG-SUR-071",
      model: "OT-EH",
      nameRu: "Стол операционный электрогидравлический",
      nameEn: "Electro-hydraulic operating table",
      shortRu: "Операционный стол для многопрофильных вмешательств.",
      shortEn: "Operating table for multipurpose procedures.",
      descriptionRu: "Параметры нагрузки и аксессуары уточняются при запросе.",
      descriptionEn: "Load capacity and accessories confirmed on request.",
      category: "surgery",
      manufacturer: "reagent-hospital",
      image:
        "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&q=80",
    },
    {
      slug: "icu-ventilator",
      sku: "RG-ICU-080",
      model: "VENT-1",
      nameRu: "Аппарат ИВЛ (ОРИТ)",
      nameEn: "ICU ventilator",
      shortRu: "Аппарат искусственной вентиляции лёгких для ОРИТ.",
      shortEn: "Mechanical ventilator for intensive care.",
      descriptionRu:
        "Критически важное оборудование. Конфигурация и сервис — только через запрос цены.",
      descriptionEn:
        "Critical care equipment. Configuration and service only via quote request.",
      category: "icu",
      manufacturer: "reagent-hospital",
      featured: true,
      image:
        "https://images.unsplash.com/photo-1584036561560-7b509de853c2?w=800&q=80",
    },
    {
      slug: "defibrillator-monitor",
      sku: "RG-CAR-090",
      model: "DF-M",
      nameRu: "Дефибриллятор-монитор",
      nameEn: "Defibrillator monitor",
      shortRu: "Оборудование для неотложной кардиологической помощи.",
      shortEn: "Equipment for emergency cardiac care.",
      descriptionRu: "Кардиологическое оборудование. Обучение и комплектация — по запросу.",
      descriptionEn: "Cardiology equipment. Training and configuration on request.",
      category: "cardiology",
      manufacturer: "reagent-hospital",
      image:
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
    },
    {
      slug: "ecg-device-12ch",
      sku: "RG-CAR-091",
      model: "ECG-12",
      nameRu: "Электрокардиограф 12-канальный",
      nameEn: "12-channel electrocardiograph",
      shortRu: "Регистрация ЭКГ в клинической практике.",
      shortEn: "ECG recording for clinical practice.",
      descriptionRu: "Диагностическое кардиологическое оборудование.",
      descriptionEn: "Diagnostic cardiology equipment.",
      category: "cardiology",
      manufacturer: "reagent-hospital",
      image:
        "https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=800&q=80",
    },
    {
      slug: "autoclave-tabletop",
      sku: "RG-DIS-100",
      model: "AC-T23",
      nameRu: "Автоклав настольный (паровой стерилизатор)",
      nameEn: "Tabletop autoclave (steam sterilizer)",
      shortRu: "Стерилизация инструментов и материалов.",
      shortEn: "Sterilization of instruments and materials.",
      descriptionRu: "Оборудование дезинфекции/стерилизации. Объём камеры — по запросу.",
      descriptionEn: "Disinfection/sterilization equipment. Chamber volume on request.",
      category: "disinfection",
      manufacturer: "reagent-hospital",
      featured: true,
      image:
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
    },
    {
      slug: "washer-disinfector",
      sku: "RG-DIS-101",
      model: "WD-1",
      nameRu: "Моюще-дезинфицирующая машина",
      nameEn: "Washer-disinfector",
      shortRu: "Оборудование CSSD для мойки и дезинфекции.",
      shortEn: "CSSD equipment for washing and disinfection.",
      descriptionRu: "Параметры циклов и загрузки — в коммерческом предложении.",
      descriptionEn: "Cycle and load parameters in the commercial offer.",
      category: "disinfection",
      manufacturer: "reagent-hospital",
      image:
        "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&q=80",
    },
    {
      slug: "ultrasound-gel-pack",
      sku: "RG-CON-042",
      nameRu: "Гель для УЗИ (упаковка)",
      nameEn: "Ultrasound gel (pack)",
      shortRu: "Расходный материал для ультразвуковой диагностики.",
      shortEn: "Consumable for ultrasound diagnostics.",
      descriptionRu: "Расходники. Партии и фасовка — по запросу.",
      descriptionEn: "Consumables. Batches and packaging on request.",
      category: "consumables",
      manufacturer: "reagent-imaging",
      image:
        "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80",
    },
    {
      slug: "pulse-oximeter-bedside",
      sku: "RG-MED-032",
      model: "POX-1",
      nameRu: "Пульсоксиметр (прикроватный)",
      nameEn: "Bedside pulse oximeter",
      shortRu: "Мониторинг сатурации кислорода.",
      shortEn: "Oxygen saturation monitoring.",
      descriptionRu: "Медицинское оборудование. Комплектация датчиков — по запросу.",
      descriptionEn: "Medical equipment. Sensor configuration on request.",
      category: "diagnostics",
      manufacturer: "reagent-hospital",
      image:
        "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80",
    },
    {
      slug: "anesthesia-machine",
      sku: "RG-SUR-072",
      model: "AN-1",
      nameRu: "Наркозный аппарат",
      nameEn: "Anesthesia machine",
      shortRu: "Аппарат для анестезии в операционном блоке.",
      shortEn: "Anesthesia delivery system for the operating room.",
      descriptionRu: "Оборудование оперблока. Конфигурация — только через запрос.",
      descriptionEn: "OR equipment. Configuration only via inquiry.",
      category: "surgery",
      manufacturer: "reagent-hospital",
      image:
        "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=800&q=80",
    },
    {
      slug: "infant-incubator",
      sku: "RG-ICU-081",
      model: "INC-N",
      nameRu: "Инкубатор для новорождённых",
      nameEn: "Neonatal incubator",
      shortRu: "Оборудование неонатального ухода.",
      shortEn: "Neonatal care equipment.",
      descriptionRu: "ОРИТ/неонатология. Опции мониторинга — по запросу.",
      descriptionEn: "ICU/neonatal. Monitoring options on request.",
      category: "icu",
      manufacturer: "reagent-hospital",
      image:
        "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&q=80",
    },
  ];

  for (const p of products) {
    await prisma.product.create({
      data: {
        slug: p.slug,
        sku: p.sku,
        model: p.model,
        nameRu: p.nameRu,
        nameEn: p.nameEn,
        shortRu: p.shortRu,
        shortEn: p.shortEn,
        descriptionRu: p.descriptionRu,
        descriptionEn: p.descriptionEn,
        applicationsRu: p.applicationsRu,
        applicationsEn: p.applicationsEn,
        featured: p.featured ?? false,
        categoryId: c[p.category],
        manufacturerId: m[p.manufacturer],
        images: {
          create: [
            {
              url: p.image,
              altRu: p.nameRu,
              altEn: p.nameEn,
              sortOrder: 0,
            },
          ],
        },
        specifications: p.specs
          ? {
              create: p.specs.map((s, i) => ({ ...s, sortOrder: i })),
            }
          : undefined,
      },
    });
  }

  await prisma.article.createMany({
    data: [
      {
        slug: "how-to-request-a-quote",
        titleRu: "Как запросить цену в РЕАГЕНТ",
        titleEn: "How to request a quote from REAGENT",
        excerptRu: "Краткий гид по B2B-запросу коммерческого предложения.",
        excerptEn: "A short guide to B2B quote requests.",
        bodyRu:
          "Выберите продукт в каталоге, нажмите «Запросить цену», укажите контакты и количество. Отдел продаж РЕАГЕНТ подготовит предложение. Публичные цены на сайте не размещаются.",
        bodyEn:
          "Select a product, click Request a Quote, provide contacts and quantity. REAGENT sales will prepare an offer. Public prices are not listed on the website.",
      },
      {
        slug: "catalog-structure",
        titleRu: "Структура каталога РЕАГЕНТ",
        titleEn: "REAGENT catalog structure",
        excerptRu: "Категории от реагентов до ОРИТ.",
        excerptEn: "Categories from reagents to ICU.",
        bodyRu:
          "Каталог организован по клиническим и лабораторным направлениям: реагенты, лабораторное и медицинское оборудование, расходники, радиология, хирургия, ОРИТ и дезинфекция.",
        bodyEn:
          "The catalog is organized by clinical and laboratory domains: reagents, lab and medical equipment, consumables, radiology, surgery, ICU and disinfection.",
      },
    ],
  });

  console.log(
    `✓ REAGENT seed: ${categories.length} categories, ${manufacturers.length} manufacturers, ${products.length} products, 2 articles`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
