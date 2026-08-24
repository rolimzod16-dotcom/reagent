/** Case-insensitive product search filter for Postgres (Prisma). */
export function productSearchWhere(query: string) {
  const q = query.trim();
  if (!q) return {};
  return {
    OR: [
      { nameRu: { contains: q, mode: "insensitive" as const } },
      { nameEn: { contains: q, mode: "insensitive" as const } },
      { sku: { contains: q, mode: "insensitive" as const } },
      { model: { contains: q, mode: "insensitive" as const } },
      { shortRu: { contains: q, mode: "insensitive" as const } },
      { shortEn: { contains: q, mode: "insensitive" as const } },
      { slug: { contains: q, mode: "insensitive" as const } },
      {
        manufacturer: { name: { contains: q, mode: "insensitive" as const } },
      },
      {
        category: { nameRu: { contains: q, mode: "insensitive" as const } },
      },
      {
        category: { nameEn: { contains: q, mode: "insensitive" as const } },
      },
    ],
  };
}
