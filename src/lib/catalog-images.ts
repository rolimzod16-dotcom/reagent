/** Original REAGENT category photos (not copied from medtech / partners). */

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

const BY_SLUG: Record<string, string> = {
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

function isForeignCatalogPhoto(url?: string | null): boolean {
  if (!url) return true;
  if (url.startsWith("/catalog/")) return false;
  const u = url.toLowerCase();
  return (
    u.includes("medtech.tj") ||
    u.includes("vector-best") ||
    u.includes("deznet") ||
    u.includes("threelab") ||
    u.includes("images.openai.com") ||
    u.includes("cloudinary.com/dmxv0xzjf")
  );
}

export function defaultCatalogImage(slug: string): string {
  if (BY_SLUG[slug]) return BY_SLUG[slug];
  if (slug.startsWith("vb-immunochemistry")) return FILES.ifa;
  if (slug.startsWith("vb-eq")) return FILES.labInstruments;
  if (slug.startsWith("vb-ptsr") || slug.includes("ptsr")) return FILES.pcr;
  if (slug.startsWith("threelab") || slug.startsWith("tl-") || slug.startsWith("lab-")) {
    return FILES.labInstruments;
  }
  if (slug.startsWith("cons-") || slug.includes("raskhod")) return FILES.consumables;
  if (slug.includes("laborator")) return FILES.laboratory;
  if (
    slug.includes("diagnost") ||
    slug.includes("uzi") ||
    slug.includes("ultrasound")
  ) {
    return FILES.diagnostics;
  }
  if (slug.includes("hirurg") || slug.includes("surg")) return FILES.surgery;
  if (
    slug.includes("reanim") ||
    slug.includes("ivl") ||
    slug.includes("anesthes")
  ) {
    return FILES.icu;
  }
  if (slug.includes("izmeritel")) return FILES.measuring;
  if (slug.includes("dezinfek") || slug.includes("steril")) return FILES.sterile;
  if (slug.includes("endoskop")) return FILES.endoscopy;
  return FILES.diagnostics;
}

/** Prefer admin-uploaded photo; skip copied competitor URLs. */
export function catalogImage(slug: string, stored?: string | null): string {
  const custom = stored?.trim();
  if (custom && !isForeignCatalogPhoto(custom)) return custom;
  return defaultCatalogImage(slug);
}
