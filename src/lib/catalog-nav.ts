import { field, type Locale } from "@/lib/i18n";
import type { CategoryTreeNode } from "@/lib/catalog";

export type FilterCategory = {
  slug: string;
  name: string;
  count: number;
  children: FilterCategory[];
};

/** Keep branches with products or an admin-set photo (new empty subcats). */
export function catalogNavVisible(n: CategoryTreeNode): boolean {
  if (n.count > 0) return true;
  if (n.image) return true;
  return n.children.some(catalogNavVisible);
}

/** Same published-only tree the storefront shows (empty branches dropped unless they have a photo). */
export function toFilterCategories(
  nodes: CategoryTreeNode[],
  locale: Locale
): FilterCategory[] {
  return nodes.filter(catalogNavVisible).map((n) => ({
    slug: n.slug,
    name: field(locale, n.nameRu, n.nameEn),
    count: n.count,
    children: toFilterCategories(n.children, locale),
  }));
}
