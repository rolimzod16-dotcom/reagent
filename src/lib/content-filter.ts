/** Test / placeholder records that should not appear on the storefront or in SEO. */

export function isJunkText(value?: string | null): boolean {
  const s = (value || "").trim().toLowerCase();
  if (!s) return false;
  if (/qwerty|asdfgh|zxcvbn|wsdrty/.test(s)) return true;
  if (/[`~]/.test(s)) return true;
  if (/qwertyuiop\[/.test(s)) return true;
  if (/^1212/.test(s)) return true;
  if (/^test[-_\s]?\d*$/.test(s)) return true;
  if (/^\d{5,}$/.test(s)) return true;
  if (/^[\d\s()+-]{8,}$/.test(s) && /^\D*\d/.test(s)) {
    const digits = s.replace(/\D/g, "");
    if (/^0+$/.test(digits) || /^123456/.test(digits) || /^(\d)\1{5,}$/.test(digits)) {
      return true;
    }
  }
  return false;
}

/** Prisma clause: extra belt after DB unpublish. */
export const junkProductPrismaOr = [
  { nameRu: { contains: "qwerty", mode: "insensitive" as const } },
  { nameEn: { contains: "qwerty", mode: "insensitive" as const } },
  { slug: { contains: "qwerty" } },
  { slug: { startsWith: "1212" } },
  { nameRu: { startsWith: "123456" } },
  { nameRu: { startsWith: "1212" } },
  { sku: { startsWith: "123456" } },
];
