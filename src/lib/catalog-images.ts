/** Original REAGENT category photos (not copied from medtech / partners). */

import uniqueJson from "./catalog-unique.json";

const FILES = {
  reagents: "/catalog/reagents.jpg",
  ifa: "/catalog/ifa.jpg",
  pcr: "/catalog/pcr.jpg",
  laboratory: "/catalog/laboratory.jpg",
  labInstruments: "/catalog/lab-instruments.jpg",
  consumables: "/catalog/consumables.jpg",
  diagnostics: "/catalog/diagnostics.jpg",
  surgery: "/catalog/surgery.jpg",
  icu: "/catalog/icu.jpg",
  measuring: "/catalog/measuring.jpg",
  sterile: "/catalog/sterile.jpg",
  endoscopy: "/catalog/endoscopy.jpg",
} as const;

/** Unique per-slug stills in /public/catalog/cats. */
const UNIQUE: Record<string, string> = uniqueJson as Record<string, string>;

/** Root sections only — never reused for every child. */
const ROOT_BY_SLUG: Record<string, string> = {
  reaktivy_laboratornykh_issledovaniy: FILES.reagents,
  "vb-immunochemistry": FILES.ifa,
  "vb-ptsr": FILES.pcr,
  "vb-eq": FILES.labInstruments,
  laboratoriya: FILES.laboratory,
  "threelab-equipment": FILES.labInstruments,
  raskhodniki_meditsinskie: FILES.consumables,
  oborudovanie_diagnosticheskoe: FILES.diagnostics,
  hirurgicheskoe_oborudovanie_i_instrumenty: FILES.surgery,
  reanimatsionnoe_oborudovanie: FILES.icu,
  pribory_izmeritelnye: FILES.measuring,
  oborudovanie_dlya_dezinfektsii_i_sterilizatsii: FILES.sterile,
  oborudovanie_endoskopicheskoe: FILES.endoscopy,
};

const GENERIC_ROOT = new Set(Object.values(FILES));

function isForeignCatalogPhoto(url?: string | null): boolean {
  if (!url) return true;
  if (url.startsWith("/catalog/cats/")) return false;
  if (url.startsWith("/catalog/")) return GENERIC_ROOT.has(url);
  const u = url.toLowerCase();
  return (
    u.includes("medtech.tj") ||
    u.includes("vector-best") ||
    u.includes("deznet") ||
    u.includes("threelab") ||
    u.includes("images.openai.com") ||
    u.includes("cloudinary.com/dmxv0xzjf") ||
    u.includes("postimg.cc")
  );
}

export function defaultCatalogImage(slug: string): string {
  if (UNIQUE[slug]) return UNIQUE[slug];
  if (ROOT_BY_SLUG[slug]) return ROOT_BY_SLUG[slug];
  if (slug.startsWith("lab-") || slug.startsWith("threelab") || slug.startsWith("tl-")) {
    return FILES.labInstruments;
  }
  if (slug.startsWith("cons-")) return FILES.consumables;
  if (slug.startsWith("vb-ptsr") || slug.includes("ptsr")) return FILES.pcr;
  if (slug.startsWith("vb-immunochemistry")) return FILES.ifa;
  if (slug.startsWith("vb-eq")) return FILES.labInstruments;
  if (slug.includes("endoskop")) return FILES.endoscopy;
  if (slug.includes("dezinfek") || slug.includes("steril")) return FILES.sterile;
  if (slug.includes("hirurg")) return FILES.surgery;
  if (slug.includes("reanim") || slug.includes("ivl")) return FILES.icu;
  return FILES.diagnostics;
}

/** Prefer a unique per-slug photo; skip copied competitor URLs and shared root shots. */
export function catalogImage(slug: string, stored?: string | null): string {
  if (UNIQUE[slug]) return UNIQUE[slug];
  const custom = stored?.trim();
  if (custom && !isForeignCatalogPhoto(custom) && !GENERIC_ROOT.has(custom)) {
    return custom;
  }
  return defaultCatalogImage(slug);
}
