import { prisma } from "@/lib/prisma";
import { getLocale, isLocale, t, field } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/Breadcrumbs";
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
    title: t(locale, "articles_title"),
    alternates: {
      canonical: `/${locale}/articles`,
      languages: { ru: "/ru/articles", en: "/en/articles" },
    },
  };
}

export default async function ArticlesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = getLocale({ locale: raw });

  const articles = await prisma.article.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: t(locale, "breadcrumb_home") },
          { label: t(locale, "articles_title") },
        ]}
      />
      <h1 className="mb-8 text-3xl font-semibold text-slate-900">
        {t(locale, "articles_title")}
      </h1>
      <div className="grid gap-4 md:grid-cols-2">
        {articles.map((a) => (
          <Link
            key={a.id}
            href={`/${locale}/articles/${a.slug}`}
            className="border border-slate-200 bg-white p-6 transition hover:border-brand-400"
          >
            <h2 className="font-semibold text-slate-900">
              {field(locale, a.titleRu, a.titleEn)}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {field(locale, a.excerptRu, a.excerptEn)}
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-brand-700">
              {t(locale, "read_more")} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
