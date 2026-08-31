import { prisma } from "@/lib/prisma";
import { getLocale, isLocale, t, field } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CatalogDownloadLink } from "@/components/CatalogDownloadLink";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 300;
export const maxDuration = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = getLocale({ locale: raw });
  return {
    title: t(locale, "documents_title"),
    alternates: {
      canonical: `/${locale}/documents`,
      languages: { ru: "/ru/documents", en: "/en/documents" },
    },
  };
}

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = getLocale({ locale: raw });

  const docs = await prisma.productDocument.findMany({
    take: 50,
    include: { product: { select: { slug: true, nameRu: true, nameEn: true } } },
    orderBy: { id: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: t(locale, "breadcrumb_home") },
          { label: t(locale, "documents_title") },
        ]}
      />
      <h1 className="mb-4 text-3xl font-semibold text-slate-900">
        {t(locale, "documents_title")}
      </h1>
      <p className="mb-6 text-sm text-slate-600">
        {locale === "ru"
          ? "Полный каталог сайта — одним файлом, как у производителя: скачайте PDF и работайте офлайн. Ниже — инструкции и паспорта по отдельным позициям."
          : "The full site catalog is one PDF — download and work offline. Individual manuals and datasheets are listed below."}
      </p>
      <CatalogDownloadLink locale={locale} variant="banner" className="mb-8" />
      {docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-center">
          <p className="text-sm text-muted">{t(locale, "no_docs")}</p>
          <p className="mt-2 text-sm text-muted">
            {locale === "ru"
              ? "Нужен паспорт, инструкция или регистрационное удостоверение — запросите вместе с ценой."
              : "Need a datasheet, manual or registration certificate? Request it with your quote."}
          </p>
          <Link
            href={`/${locale}/contact`}
            className="mt-5 inline-flex text-sm font-bold text-green hover:underline"
          >
            {locale === "ru" ? "Оставить запрос →" : "Send a request →"}
          </Link>
        </div>
      ) : (
        <ul className="divide-y border border-slate-200">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <a
                  href={d.url}
                  className="font-medium text-brand-700 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {field(locale, d.titleRu, d.titleEn)}
                </a>
                <p className="text-xs text-slate-400">
                  {field(locale, d.product.nameRu, d.product.nameEn)}
                </p>
              </div>
              <Link
                href={`/${locale}/product/${d.product.slug}`}
                className="text-xs text-slate-500 hover:text-brand-700"
              >
                →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
