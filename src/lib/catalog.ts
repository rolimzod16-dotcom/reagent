import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/content-filter";

export type CategoryTreeNode = {
  id: string;
  slug: string;
  nameRu: string;
  nameEn: string;
  image: string | null;
  count: number;
  childCount: number;
  children: CategoryTreeNode[];
};

type CatRow = {
  id: string;
  parentId: string | null;
  slug: string;
  nameRu: string;
  nameEn: string;
  image: string | null;
  sortOrder: number;
};

type CategoryGraph = {
  all: CatRow[];
  byParent: Record<string, CatRow[]>;
  childrenMap: Record<string, string[]>;
  directCount: Record<string, number>;
};

function rootKey(parentId: string | null) {
  return parentId ?? "__root__";
}

async function fetchCategoryGraph(): Promise<CategoryGraph> {
  const [all, grouped] = await Promise.all([
    prisma.category.findMany({
      // Imported public products can still reference a category whose legacy
      // `published` flag is false. Keep those categories navigable so product
      // breadcrumbs never lead to a missing catalog page. Empty categories
      // are still removed by buildTreeNodes below.
      select: {
        id: true,
        parentId: true,
        slug: true,
        nameRu: true,
        nameEn: true,
        image: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.groupBy({
      by: ["categoryId"],
      where: publicProductWhere,
      _count: { _all: true },
    }),
  ]);

  const directCount: Record<string, number> = {};
  for (const g of grouped) {
    directCount[g.categoryId] = g._count._all;
  }

  const byParent: Record<string, CatRow[]> = {};
  const childrenMap: Record<string, string[]> = {};
  for (const c of all) {
    const key = rootKey(c.parentId);
    (byParent[key] ||= []).push(c);
    if (c.parentId) {
      (childrenMap[c.parentId] ||= []).push(c.id);
    }
  }

  return { all, byParent, childrenMap, directCount };
}

/** Cached graph — avoids hammering Postgres on every catalog hit. */
const getCachedCategoryGraph = unstable_cache(
  async () => fetchCategoryGraph(),
  ["category-graph-v16"],
  { revalidate: 120, tags: ["catalog"] }
);

function descendantIdsFrom(
  childrenMap: Record<string, string[]>,
  rootId: string
): string[] {
  const out: string[] = [];
  const visited = new Set<string>([rootId]);
  const queue = [...(childrenMap[rootId] || [])];
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    out.push(id);
    for (const child of childrenMap[id] || []) queue.push(child);
  }
  return out;
}

function subtreeCountFrom(
  childrenMap: Record<string, string[]>,
  directCount: Record<string, number>,
  categoryId: string
): number {
  let n = directCount[categoryId] || 0;
  for (const id of descendantIdsFrom(childrenMap, categoryId)) {
    n += directCount[id] || 0;
  }
  return n;
}

/** All published descendant category IDs (any depth). */
export async function getDescendantCategoryIds(
  rootId: string
): Promise<string[]> {
  const graph = await getCachedCategoryGraph();
  return descendantIdsFrom(graph.childrenMap, rootId);
}

function buildTreeNodes(
  graph: CategoryGraph,
  parentId: string | null
): CategoryTreeNode[] {
  return (graph.byParent[rootKey(parentId)] || []).flatMap((c) => {
    const count = subtreeCountFrom(graph.childrenMap, graph.directCount, c.id);
    if (count === 0) return [];

    const children = buildTreeNodes(graph, c.id);
    return [{
      id: c.id,
      slug: c.slug,
      nameRu: c.nameRu,
      nameEn: c.nameEn,
      image: c.image,
      count,
      childCount: children.length,
      children,
    }];
  });
}

/** Full published tree (any depth) + product counts of the whole subtree. */
export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const graph = await getCachedCategoryGraph();
  return buildTreeNodes(graph, null);
}

export async function getCategoryWithAncestry(slug: string) {
  const graph = await getCachedCategoryGraph();
  const category = graph.all.find((c) => c.slug === slug);
  if (!category) return null;
  if (subtreeCountFrom(graph.childrenMap, graph.directCount, category.id) === 0) {
    return null;
  }

  // Derive parent/children from cached graph — no extra DB round-trip
  const parent = category.parentId
    ? graph.all.find((c) => c.id === category.parentId) || null
    : null;
  const children = graph.byParent[rootKey(category.id)] || [];
  const childIds = descendantIdsFrom(graph.childrenMap, category.id);
  const childrenWithCounts = children.flatMap((ch) => {
    const count = subtreeCountFrom(graph.childrenMap, graph.directCount, ch.id);
    if (count === 0) return [];

    const visibleGrandchildren = (graph.byParent[rootKey(ch.id)] || [])
      .filter((g) => subtreeCountFrom(graph.childrenMap, graph.directCount, g.id) > 0)
      .map((g) => ({
        slug: g.slug,
        nameRu: g.nameRu,
        nameEn: g.nameEn,
        image: g.image,
      }));

    return [{
      id: ch.id,
      slug: ch.slug,
      nameRu: ch.nameRu,
      nameEn: ch.nameEn,
      image: ch.image,
      parentId: ch.parentId,
      sortOrder: ch.sortOrder,
      count,
      childCount: visibleGrandchildren.length,
      children: visibleGrandchildren,
    }];
  });

  return {
    category: {
      ...category,
      descriptionRu: null as string | null,
      descriptionEn: null as string | null,
      published: true,
      parent: parent
        ? {
            id: parent.id,
            slug: parent.slug,
            nameRu: parent.nameRu,
            nameEn: parent.nameEn,
          }
        : null,
      children,
    },
    childIds,
    childrenWithCounts,
  };
}

/** Subtree product count from cached graph (no live COUNT queries). */
export async function getSubtreeProductCount(categoryId: string): Promise<number> {
  const graph = await getCachedCategoryGraph();
  return subtreeCountFrom(graph.childrenMap, graph.directCount, categoryId);
}
