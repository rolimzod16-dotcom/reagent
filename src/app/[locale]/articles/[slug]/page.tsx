import { prisma } from "@/lib/prisma";
import { getLocale, isLocale, t, field } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 300;
export const maxDuration = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  const locale = getLocale({ locale: raw });
  const a = await prisma.article.findUnique({ where: { slug } });
  if (!a) return {};
  return {
    title: field(locale, a.titleRu, a.titleEn),
    description: field(locale, a.excerptRu, a.excerptEn) || undefined,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = getLocale({ locale: raw });
  const a = await prisma.article.findUnique({ where: { slug } });
  if (!a || !a.published) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: t(locale, "breadcrumb_home") },
          { href: `/${locale}/articles`, label: t(locale, "articles_title") },
          { label: field(locale, a.titleRu, a.titleEn) },
        ]}
      />
      <h1 className="text-3xl font-semibold text-slate-900">
        {field(locale, a.titleRu, a.titleEn)}
      </h1>
      <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-slate-600">
        {field(locale, a.bodyRu, a.bodyEn)}
      </p>
    </article>
  );
}
