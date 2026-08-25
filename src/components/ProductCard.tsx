import Link from "next/link";
import Image from "next/image";
import { Locale, field } from "@/lib/i18n";
import { QuoteButton } from "./QuoteButton";
import { AddToCartButton } from "./AddToCartButton";
import { displayPrice } from "@/lib/price";

type ProductCardProps = {
  locale: Locale;
  product: {
    id: string;
    slug: string;
    sku: string | null;
    model: string | null;
    nameRu: string;
    nameEn: string;
    shortRu: string | null;
    shortEn: string | null;
    manufacturer?: { name: string; slug: string } | null;
    images: { url: string; altRu: string | null; altEn: string | null }[];
    priceAmount?: string | null;
    priceCurrency?: string | null;
    priceOnRequest?: boolean | null;
  };
  index?: number;
};

export function ProductCard({ locale, product }: ProductCardProps) {
  const name = field(locale, product.nameRu, product.nameEn);
  const short = field(locale, product.shortRu, product.shortEn);
  const img = product.images[0];
  const price = displayPrice(product, locale);

  return (
    <article className="group card flex flex-col overflow-hidden">
      <Link
        href={`/${locale}/product/${product.slug}`}
        className="relative aspect-[4/3] overflow-hidden bg-white"
      >
        {img ? (
          <Image
            src={img.url}
            alt={field(locale, img.altRu, img.altEn) || name}
            fill
            className="img-zoom object-contain p-3"
            sizes="(max-width: 768px) 100vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl font-bold text-slate-300">
            R
          </div>
        )}
        {product.sku && (
          <span className="absolute left-3 top-3 rounded bg-white/95 px-2 py-0.5 font-mono text-[10px] font-bold text-green shadow-sm">
            {product.sku}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {product.manufacturer && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-green-mid">
            {product.manufacturer.name}
          </p>
        )}
        <Link href={`/${locale}/product/${product.slug}`}>
          <h3 className="break-long line-clamp-2 text-sm font-bold leading-snug text-ink transition group-hover:text-green sm:text-[15px]">
            {name}
          </h3>
        </Link>
        {short && (
          <p className="break-long mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
            {short}
          </p>
        )}

        <div className="mt-auto border-t border-line pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-green">
              {price.label}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <AddToCartButton
              locale={locale}
              productId={product.id}
              productName={name}
              productSku={product.sku || undefined}
              imageUrl={img?.url}
              slug={product.slug}
              compact
            />
            <QuoteButton
              locale={locale}
              productSlug={product.slug}
              compact
            />
          </div>
        </div>
      </div>
    </article>
  );
}
