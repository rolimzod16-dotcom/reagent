import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, locales } from "@/lib/i18n";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Security headers on all responses
  const response = (() => {
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    // Protect /admin UI: still public HTML, but no special bypass
    const hasLocale = locales.some(
      (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
    );

    if (!hasLocale && !pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  })();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  // Do not cache authenticated API
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/admin")) {
    response.headers.set("Cache-Control", "no-store");
  } else if (
    // Public storefront: CDN absorbs evening peak in TJ
    /^\/(ru|en)$/.test(pathname) ||
    /^\/(ru|en)\/(catalog|brands|articles|solutions|about|contact|faq|documents)(\/|$)/.test(
      pathname
    ) ||
    /^\/(ru|en)\/product\/[^/]+$/.test(pathname) ||
    pathname === "/sitemap.xml"
  ) {
    if (!request.nextUrl.search) {
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=180, stale-while-revalidate=900"
      );
    } else {
      // Filtered catalog pages still get a short edge cache
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
