import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SITE_EMAIL, SITE_PHONE } from "@/lib/site";

export const DEFAULT_ABOUT_RU = `РЕАГЕНТ (reagent.tj) — B2B-платформа медицинского направления в Таджикистане. Каталог оборудования, реагентов и расходных материалов для клиник, лабораторий и дистрибьюторов.

География поставок: Душанбе, Худжанд, Бохтар, Куляб и другие регионы республики. Мы сопровождаем запрос цены, подбор позиций и условия поставки без публичного прайса.

Направления:
• Медицинское оборудование (диагностика, стационар, лаборатория)
• Расходные материалы для клиники и лаборатории
• Реагенты и наборы: ПЦР, иммунохимия / ИФА, клиническая биохимия, гемостаз`;

export const DEFAULT_ABOUT_EN = `REAGENT (reagent.tj) is a B2B medical platform in Tajikistan. Catalog of equipment, reagents and consumables for clinics, labs and distributors.

Coverage: Dushanbe, Khujand, Bokhtar, Kulob and other regions. Quote-based commercial process without public price lists.

Focus areas:
• Medical equipment (diagnostics, hospital, laboratory)
• Consumables for clinic and lab
• Reagents: PCR, immunochemistry / ELISA, chemistry, hemostasis`;

const DEFAULT_SOLUTIONS = [
  {
    slug: "laboratory",
    titleRu: "Лабораторные решения",
    titleEn: "Laboratory solutions",
    bodyRu: "Оборудование и реагенты для клинической диагностики.",
    bodyEn: "Equipment and reagents for clinical diagnostics.",
    catalogSlug: "laboratoriya",
    sortOrder: 1,
  },
  {
    slug: "surgery",
    titleRu: "Операционный блок",
    titleEn: "Operating room",
    bodyRu: "Освещение, столы, анестезия и сопутствующее оснащение.",
    bodyEn: "Lighting, tables, anesthesia and related equipment.",
    catalogSlug: "hirurgicheskoe_oborudovanie_i_instrumenty",
    sortOrder: 2,
  },
  {
    slug: "icu",
    titleRu: "ОРИТ",
    titleEn: "ICU",
    bodyRu: "Оборудование интенсивной терапии и мониторинга.",
    bodyEn: "Critical care and monitoring equipment.",
    catalogSlug: "reanimatsionnoe_oborudovanie",
    sortOrder: 3,
  },
  {
    slug: "imaging",
    titleRu: "Визуализация",
    titleEn: "Imaging",
    bodyRu: "Рентген, УЗИ и связанные системы.",
    bodyEn: "X-ray, ultrasound and related systems.",
    catalogSlug: "oborudovanie_diagnosticheskoe",
    sortOrder: 4,
  },
  {
    slug: "sterilization",
    titleRu: "Стерилизация",
    titleEn: "Sterilization",
    bodyRu: "Автоклавы и моюще-дезинфицирующее оборудование.",
    bodyEn: "Autoclaves and washer-disinfectors.",
    catalogSlug: "oborudovanie_dlya_dezinfektsii_i_sterilizatsii",
    sortOrder: 5,
  },
  {
    slug: "consumables",
    titleRu: "Расходные материалы",
    titleEn: "Consumables",
    bodyRu: "Расходники и оснащение отделений.",
    bodyEn: "Consumables and ward equipment.",
    catalogSlug: "raskhodniki_meditsinskie",
    sortOrder: 6,
  },
];

export async function ensureCmsDefaults() {
  await prisma.siteSettings.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      email: SITE_EMAIL,
      phone: SITE_PHONE,
      phone2: "",
      addressRu: "Душанбе, Таджикистан",
      addressEn: "Dushanbe, Tajikistan",
      hoursRu: "Пн–Пт, 9:00–18:00",
      hoursEn: "Mon–Fri, 9:00–18:00",
      noteRu: "Цена по запросу. Ответим в рабочее время.",
      noteEn: "Price on request. We reply during business hours.",
      legalNameRu: "ООО «Тибби Хуршед»",
      legalNameTj: "ЧДММ «Тибби Хуршед»",
      legalNameEn: "Tibbi Khurshed LLC",
      inn: "",
    },
    update: {},
  });

  const legal = await prisma.siteSettings.findUnique({
    where: { id: "main" },
    select: { legalNameRu: true, legalNameTj: true, legalNameEn: true },
  });
  if (
    legal &&
    (legal.legalNameRu.includes("Тиби Хуршед") ||
      legal.legalNameTj.includes("Тиби Хуршед") ||
      legal.legalNameEn.includes("Tibi Khurshed"))
  ) {
    await prisma.siteSettings.update({
      where: { id: "main" },
      data: {
        legalNameRu: legal.legalNameRu.replaceAll(
          "Тиби Хуршед",
          "Тибби Хуршед"
        ),
        legalNameTj: legal.legalNameTj.replaceAll(
          "Тиби Хуршед",
          "Тибби Хуршед"
        ),
        legalNameEn: legal.legalNameEn.replaceAll(
          "Tibi Khurshed",
          "Tibbi Khurshed"
        ),
      },
    });
  }

  await prisma.cmsPage.upsert({
    where: { key: "about" },
    create: {
      key: "about",
      titleRu: "О компании РЕАГЕНТ",
      titleEn: "About REAGENT",
      bodyRu: DEFAULT_ABOUT_RU,
      bodyEn: DEFAULT_ABOUT_EN,
    },
    update: {},
  });

  await prisma.solution.createMany({
    data: DEFAULT_SOLUTIONS,
    skipDuplicates: true,
  });
}

const FALLBACK_SETTINGS = {
  id: "main",
  email: SITE_EMAIL,
  phone: SITE_PHONE,
  phone2: "",
  addressRu: "Душанбе, Таджикистан",
  addressEn: "Dushanbe, Tajikistan",
  hoursRu: "Пн–Пт, 9:00–18:00",
  hoursEn: "Mon–Fri, 9:00–18:00",
  noteRu: "",
  noteEn: "",
  legalNameRu: "ООО «Тибби Хуршед»",
  legalNameTj: "ЧДММ «Тибби Хуршед»",
  legalNameEn: "Tibbi Khurshed LLC",
  inn: "",
  updatedAt: new Date(),
};

export function getSiteSettings() {
  return unstable_cache(
    async () => {
      try {
        await ensureCmsDefaults();
        const row = await prisma.siteSettings.findUnique({
          where: { id: "main" },
        });
        return row || FALLBACK_SETTINGS;
      } catch {
        return FALLBACK_SETTINGS;
      }
    },
    ["site-settings-v4"],
    { revalidate: 60, tags: ["cms"] }
  )();
}

export function getCmsPage(key: string) {
  return unstable_cache(
    async () => {
      try {
        await ensureCmsDefaults();
        return prisma.cmsPage.findUnique({ where: { key } });
      } catch {
        return null;
      }
    },
    ["cms-page-v1", key],
    { revalidate: 60, tags: ["cms"] }
  )();
}

export function getPublishedSolutions() {
  return unstable_cache(
    async () => {
      try {
        await ensureCmsDefaults();
        return prisma.solution.findMany({
          where: { published: true },
          orderBy: { sortOrder: "asc" },
        });
      } catch {
        return [];
      }
    },
    ["solutions-public-v1"],
    { revalidate: 60, tags: ["cms"] }
  )();
}
