import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { locales } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { isJunkText } from "@/lib/content-filter";

export const revalidate = 3600;

function dayStamp(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function langs(path: string): NonNullable<MetadataRoute.Sitemap[0]["alternates"]> {
  const p = path.startsWith("/") ? path : `/${path}`;
  return {
    languages: {
      ru: `${SITE_URL}/ru${p === "/" ? "" : p}`,
      en: `${SITE_URL}/en${p === "/" ? "" : p}`,
      "x-default": `${SITE_URL}/ru${p === "/" ? "" : p}`,
    },
  };
}

const getSitemapEntries = unstable_cache(
  async (): Promise<MetadataRoute.Sitemap> => {
    const now = dayStamp(new Date());

    const staticPaths: {
      path: string;
      priority: number;
      freq: MetadataRoute.Sitemap[0]["changeFrequency"];
    }[] = [
      { path: "", priority: 1, freq: "daily" },
      { path: "/catalog", priority: 0.95, freq: "daily" },
      { path: "/brands", priority: 0.7, freq: "weekly" },
      { path: "/solutions", priority: 0.65, freq: "monthly" },
      { path: "/articles", priority: 0.6, freq: "weekly" },
      { path: "/documents", priority: 0.5, freq: "monthly" },
      { path: "/faq", priority: 0.5, freq: "monthly" },
      { path: "/about", priority: 0.6, freq: "monthly" },
      { path: "/contact", priority: 0.7, freq: "monthly" },
    ];

    const entries: MetadataRoute.Sitemap = [];

    for (const locale of locales) {
      for (const item of staticPaths) {
        const path = item.path;
        entries.push({
          url: `${SITE_URL}/${locale}${path}`,
          lastModified: now,
          changeFrequency: item.freq,
          priority: item.priority,
          alternates: langs(path || "/"),
        });
      }
    }

    try {
      const [products, categories, brands, articles] = await Promise.all([
        prisma.product.findMany({
          where: { published: true },
          select: { slug: true, nameRu: true, updatedAt: true },
          take: 4000,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.category.findMany({
          where: { published: true },
          select: { slug: true, updatedAt: true },
          orderBy: { sortOrder: "asc" },
        }),
        prisma.manufacturer.findMany({
          where: { published: true },
          select: { slug: true, name: true, updatedAt: true },
        }),
        prisma.article.findMany({
          where: { published: true },
          select: { slug: true, updatedAt: true },
        }),
      ]);

      const cleanProducts = products.filter(
        (p) => !isJunkText(p.slug) && !isJunkText(p.nameRu)
      );
      const cleanBrands = brands.filter(
        (b) => !isJunkText(b.slug) && !isJunkText(b.name)
      );

      for (const locale of locales) {
        for (const p of cleanProducts) {
          entries.push({
            url: `${SITE_URL}/${locale}/product/${p.slug}`,
            lastModified: dayStamp(p.updatedAt),
            changeFrequency: "weekly",
            priority: 0.8,
            alternates: langs(`/product/${p.slug}`),
          });
        }
        for (const c of categories) {
          entries.push({
            url: `${SITE_URL}/${locale}/catalog/${c.slug}`,
            lastModified: dayStamp(c.updatedAt),
            changeFrequency: "weekly",
            priority: 0.75,
            alternates: langs(`/catalog/${c.slug}`),
          });
        }
        for (const b of cleanBrands) {
          entries.push({
            url: `${SITE_URL}/${locale}/brands/${b.slug}`,
            lastModified: dayStamp(b.updatedAt),
            changeFrequency: "monthly",
            priority: 0.55,
            alternates: langs(`/brands/${b.slug}`),
          });
        }
        for (const a of articles) {
          entries.push({
            url: `${SITE_URL}/${locale}/articles/${a.slug}`,
            lastModified: dayStamp(a.updatedAt),
            changeFrequency: "monthly",
            priority: 0.5,
            alternates: langs(`/articles/${a.slug}`),
          });
        }
      }
    } catch (e) {
      console.error("sitemap db", e);
    }

    return entries;
  },
  ["sitemap-v8"],
  { revalidate: 3600, tags: ["catalog"] }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapEntries();
}
