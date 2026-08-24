import { getLocale, isLocale, t } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_DOMAIN } from "@/lib/site";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = getLocale({ locale: raw });
  return buildPageMetadata({
    locale,
    path: "/faq",
    title:
      locale === "ru"
        ? `FAQ — поставка медтехники в Таджикистане | ${SITE_DOMAIN}`
        : `FAQ — medical supply in Tajikistan | ${SITE_DOMAIN}`,
    description:
      locale === "ru"
        ? "Ответы: цены, сроки, поставка реагентов и оборудования в Душанбе и регионы Таджикистана. REAGENT / reagent.tj"
        : "Answers: pricing, lead times, reagent and equipment supply in Dushanbe and Tajikistan regions.",
  });
}

const faq = {
  ru: [
    {
      q: "Почему нет цен на сайте?",
      a: "РЕАГЕНТ — B2B для Таджикистана. Стоимость зависит от объёма, конфигурации и логистики (Душанбе / регионы). Используйте «Запросить цену».",
    },
    {
      q: "В какие города Таджикистана поставляете?",
      a: "Работаем с заказчиками в Душанбе, Худжанде, Бохтаре, Кулябе и других регионах. Условия логистики согласуются в коммерческом предложении.",
    },
    {
      q: "Как быстро ответят на запрос?",
      a: "Заявки поступают в систему reagent.tj и обрабатываются отделом продаж. Сроки зависят от сложности перечня.",
    },
    {
      q: "Какие реагенты есть в каталоге?",
      a: "ПЦР, иммунохимия / ИФА, клиническая биохимия, гемостаз и сопутствующие наборы. Смотрите раздел «Реагенты» в каталоге.",
    },
    {
      q: "Есть ли онлайн-оплата?",
      a: "На текущем этапе — запрос коммерческого предложения без онлайн-оплаты на сайте.",
    },
  ],
  en: [
    {
      q: "Why are there no prices?",
      a: "REAGENT is B2B for Tajikistan. Pricing depends on volume, configuration and logistics (Dushanbe / regions). Use Request a Quote.",
    },
    {
      q: "Which cities in Tajikistan do you cover?",
      a: "We work with customers in Dushanbe, Khujand, Bokhtar, Kulob and other regions. Logistics are agreed in the quote.",
    },
    {
      q: "How fast will I get a reply?",
      a: "Requests on reagent.tj go to sales. Timing depends on list complexity.",
    },
    {
      q: "What reagents are in the catalog?",
      a: "PCR, immunochemistry / ELISA, clinical chemistry, hemostasis and related kits. See Reagents in the catalog.",
    },
    {
      q: "Is online payment available?",
      a: "Not at this stage — quote request only.",
    },
  ],
};

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = getLocale({ locale: raw });
  const items = faq[locale];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <JsonLd data={faqLd} />
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: t(locale, "breadcrumb_home") },
          { label: t(locale, "faq_title") },
        ]}
      />
      <h1 className="text-3xl font-semibold text-slate-900">
        {t(locale, "faq_title")}
      </h1>
      <div className="mt-8 space-y-4">
        {items.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-line bg-white p-4 open:shadow-sm"
          >
            <summary className="cursor-pointer list-none text-sm font-bold text-ink">
              {item.q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
