/** Case-insensitive product search filter for Postgres (Prisma). */

const SEARCH_ALIASES: Record<string, string[]> = {
  экг: ["экг", "электрокардиограф", "электрокардиограмма", "ecg", "ekg"],
  ekg: ["экг", "электрокардиограф", "электрокардиограмма", "ecg", "ekg"],
  ecg: ["экг", "электрокардиограф", "электрокардиограмма", "ecg", "ekg"],
  пцр: ["пцр", "pcr", "амплификатор"],
  pcr: ["пцр", "pcr", "амплификатор"],
  ифа: ["ифа", "elisa", "иммунофермент"],
  elisa: ["ифа", "elisa", "иммунофермент"],
  ихла: ["ихла", "clia", "хемилюмин", "иммунохемилюмин"],
  clia: ["ихла", "clia", "хемилюмин"],
  узи: ["узи", "ультразвук", "ultrasound", "узи-аппарат"],
  uzi: ["узи", "ультразвук", "ultrasound"],
  ultrasound: ["узи", "ультразвук", "ultrasound"],
  ивл: ["ивл", "вентилятор", "аппарат ивл"],
  ventilator: ["ивл", "вентилятор", "аппарат ивл"],
  гемостаз: ["гемостаз", "коагулометр", "hemostasis"],
  коагулометр: ["гемостаз", "коагулометр"],
};

function expandSearchTerms(query: string): string[] {
  const q = query.trim();
  if (!q) return [];
  const key = q.toLowerCase();
  const aliased = SEARCH_ALIASES[key];
  if (aliased?.length) return [...new Set(aliased)];
  return [q];
}

function fieldContains(term: string) {
  const mode = "insensitive" as const;
  return [
    { nameRu: { contains: term, mode } },
    { nameEn: { contains: term, mode } },
    { sku: { contains: term, mode } },
    { model: { contains: term, mode } },
    { shortRu: { contains: term, mode } },
    { shortEn: { contains: term, mode } },
    { slug: { contains: term, mode } },
    { manufacturer: { name: { contains: term, mode } } },
    { category: { nameRu: { contains: term, mode } } },
    { category: { nameEn: { contains: term, mode } } },
  ];
}

export function productSearchWhere(query: string) {
  const terms = expandSearchTerms(query);
  if (!terms.length) return {};
  return {
    OR: terms.flatMap((term) => fieldContains(term)),
  };
}
