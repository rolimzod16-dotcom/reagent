import { Download } from "lucide-react";
import { CATALOG_PDF_FILENAME, CATALOG_PDF_HREF } from "@/lib/catalog-pdf";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type Variant = "header" | "button" | "banner" | "footer" | "mobile" | "outline";

export function CatalogDownloadLink({
  locale,
  variant = "button",
  className = "",
}: {
  locale: Locale;
  variant?: Variant;
  className?: string;
}) {
  const label = t(locale, "download_catalog");
  const hint = t(locale, "download_catalog_hint");

  if (variant === "header") {
    return (
      <a
        href={CATALOG_PDF_HREF}
        download={CATALOG_PDF_FILENAME}
        className={`inline-flex items-center gap-1.5 font-semibold text-green-light transition hover:text-white ${className}`}
      >
        <Download className="h-3 w-3" />
        {label}
      </a>
    );
  }

  if (variant === "footer" || variant === "mobile") {
    return (
      <a
        href={CATALOG_PDF_HREF}
        download={CATALOG_PDF_FILENAME}
        className={
          variant === "mobile"
            ? `mt-2 block border-b border-slate-100 py-3 text-sm font-semibold text-slate-700 ${className}`
            : `hover:text-white ${className}`
        }
      >
        {label}
      </a>
    );
  }

  if (variant === "outline") {
    return (
      <a
        href={CATALOG_PDF_HREF}
        download={CATALOG_PDF_FILENAME}
        className={`btn btn-outline inline-flex items-center gap-2 !py-2 !text-sm ${className}`}
      >
        <Download className="h-4 w-4" />
        {label}
      </a>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={`flex flex-col gap-4 rounded-2xl border border-green/20 bg-green-soft px-5 py-5 sm:flex-row sm:items-center sm:justify-between ${className}`}
      >
        <div>
          <p className="text-sm font-bold text-green-deep">{label}</p>
          <p className="mt-1 text-sm text-slate-600">{hint}</p>
        </div>
        <a
          href={CATALOG_PDF_HREF}
          download={CATALOG_PDF_FILENAME}
          className="btn btn-solid inline-flex shrink-0 items-center gap-2 !py-2.5 !text-sm"
        >
          <Download className="h-4 w-4" />
          {t(locale, "download_catalog_pdf")}
        </a>
      </div>
    );
  }

  return (
    <a
      href={CATALOG_PDF_HREF}
      download={CATALOG_PDF_FILENAME}
      className={`btn btn-ghost-light inline-flex items-center gap-2 ${className}`}
    >
      <Download className="h-4 w-4" />
      {label}
    </a>
  );
}
