import { Locale } from "@/lib/i18n";
import { CATALOG_PARTNER, isVectorBestCatalogSlug } from "@/lib/site";
import { Handshake } from "lucide-react";

/** Soft partnership line — only on Vector-Best reagent/equipment trees. */
export function CatalogPartnerNote({
  locale,
  slug,
}: {
  locale: Locale;
  slug?: string | null;
}) {
  if (!isVectorBestCatalogSlug(slug)) return null;
  return (
    <aside className="mt-12 rounded-2xl border border-green-200/80 bg-green-50/70 px-5 py-4 sm:px-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white">
          <Handshake className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-green-900">
            {locale === "ru"
              ? `Совместно с ${CATALOG_PARTNER.name}`
              : `In partnership with ${CATALOG_PARTNER.name}`}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-green-900/75">
            {locale === "ru" ? CATALOG_PARTNER.noteRu : CATALOG_PARTNER.noteEn}
          </p>
        </div>
      </div>
    </aside>
  );
}
