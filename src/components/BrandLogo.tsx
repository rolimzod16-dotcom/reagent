import Image from "next/image";
import { Locale } from "@/lib/i18n";
import { SITE_DOMAIN } from "@/lib/site";

export function BrandLogo({
  locale,
  tone = "light",
  showDomain = true,
  size = "md",
  priority = false,
}: {
  locale: Locale;
  tone?: "light" | "dark";
  showDomain?: boolean;
  size?: "sm" | "md";
  priority?: boolean;
}) {
  const name = locale === "ru" ? "РЕАГЕНТ" : "REAGENT";
  const mark = size === "sm" ? 36 : 48;

  return (
    <span className="flex items-center gap-2.5">
      <Image
        src="/brand/flask.png"
        alt=""
        width={mark}
        height={mark}
        className="shrink-0 object-contain"
        priority={priority}
      />
      <span className="min-w-0 leading-tight">
        <span
          className={`block font-extrabold tracking-tight ${
            size === "sm" ? "text-base" : "text-lg sm:text-xl"
          } ${
            tone === "dark"
              ? "text-white"
              : "bg-gradient-to-r from-[#1b6fd6] via-[#1d8f4a] to-[#3db83a] bg-clip-text text-transparent"
          }`}
        >
          {name}
        </span>
        {showDomain && (
          <span
            className={`hidden text-[10px] font-semibold uppercase tracking-[0.16em] sm:block ${
              tone === "dark" ? "text-white/45" : "text-muted"
            }`}
          >
            {SITE_DOMAIN}
          </span>
        )}
      </span>
    </span>
  );
}
