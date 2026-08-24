import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugifyAdmin } from "@/lib/admin-auth";
import { catalogImage, defaultCatalogImage } from "@/lib/catalog-images";
import { isHttpUrl, normalizeImageUrl } from "@/lib/image-url";

export function bustCatalogCache() {
  try {
    revalidateTag("catalog", "max");
    revalidatePath("/ru");
    revalidatePath("/en");
    revalidatePath("/ru/catalog");
    revalidatePath("/en/catalog");
  } catch {
    /* ignore outside next runtime */
  }
}

export function parseCategoryImage(
  raw: string | null | undefined
): { ok: true; value: string | null } | { ok: false } {
  if (raw == null) return { ok: true, value: null };
  const v = normalizeImageUrl(raw).trim();
  if (!v) return { ok: true, value: null };
  if (v.startsWith("/catalog/")) return { ok: true, value: v };
  if (isHttpUrl(v)) return { ok: true, value: v };
  return { ok: false };
}

export async function uniqueCategorySlug(name: string): Promise<string> {
  const base = slugifyAdmin(name) || `cat-${Date.now().toString(36)}`;
  let slug = base;
  let i = 2;
  while (await prisma.category.findUnique({ where: { slug } })) {
    slug = `${base}-${i}`;
    i += 1;
    if (i > 80) {
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      break;
    }
  }
  return slug;
}

export async function nextSortOrder(parentId: string | null): Promise<number> {
  const last = await prisma.category.findFirst({
    where: { parentId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? 0) + 1;
}

export async function isDescendant(
  ancestorId: string,
  nodeId: string
): Promise<boolean> {
  let current = await prisma.category.findUnique({
    where: { id: nodeId },
    select: { parentId: true },
  });
  const seen = new Set<string>();
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    if (seen.has(current.parentId)) break;
    seen.add(current.parentId);
    current = await prisma.category.findUnique({
      where: { id: current.parentId },
      select: { parentId: true },
    });
  }
  return false;
}

export async function categoryDepth(id: string | null): Promise<number> {
  if (!id) return 0;
  let depth = 1;
  let current = await prisma.category.findUnique({
    where: { id },
    select: { parentId: true },
  });
  const seen = new Set<string>();
  while (current?.parentId) {
    depth += 1;
    if (seen.has(current.parentId) || depth > 12) break;
    seen.add(current.parentId);
    current = await prisma.category.findUnique({
      where: { id: current.parentId },
      select: { parentId: true },
    });
  }
  return depth;
}

export function serializeCategory(c: {
  id: string;
  slug: string;
  nameRu: string;
  nameEn: string;
  image: string | null;
  parentId?: string | null;
  published?: boolean;
}) {
  return {
    ...c,
    displayImage: catalogImage(c.slug, c.image),
    defaultImage: defaultCatalogImage(c.slug),
  };
}
