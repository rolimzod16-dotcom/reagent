import { getLocale, isLocale, t, field } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getPublishedSolutions } from "@/lib/cms";
import Link from "next/link";
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
  return {
    title: t(locale, "solutions_title"),
    alternates: {
      canonical: `/${locale}/solutions`,
      languages: { ru: "/ru/solutions", en: "/en/solutions" },
    },
  };
}

export default async function SolutionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = getLocale({ locale: raw });
  const solutions = await getPublishedSolutions();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: t(locale, "breadcrumb_home") },
          { label: t(locale, "solutions_title") },
        ]}
      />
      <h1 className="mb-8 text-3xl font-semibold text-slate-900">
        {t(locale, "solutions_title")}
      </h1>
      {solutions.length === 0 ? (
        <p className="text-sm text-slate-500">
          {locale === "ru"
            ? "Разделы решений появятся после публикации в админке."
            : "Solution cards will appear after they are published in admin."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {solutions.map((s: (typeof solutions)[number]) => {
            const href = s.catalogSlug
              ? `/${locale}/catalog/${s.catalogSlug}`
              : `/${locale}/catalog`;
            return (
              <Link
                key={s.id}
                href={href}
                className="border border-slate-200 bg-white p-6 transition hover:border-brand-400"
              >
                <h2 className="font-semibold text-slate-900">
                  {field(locale, s.titleRu, s.titleEn)}
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-500">
                  {field(locale, s.bodyRu, s.bodyEn)}
                </p>
                <span className="mt-4 inline-block text-sm font-medium text-brand-700">
                  {t(locale, "read_more")} →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
