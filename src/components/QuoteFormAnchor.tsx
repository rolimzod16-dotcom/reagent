"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/** Scrolls to #quote-form when ?quote=1 is present. */
export function QuoteFormAnchor() {
  const search = useSearchParams();

  useEffect(() => {
    const want = search.get("quote") === "1";
    const el = document.getElementById("quote-form");
    if (!el) return;
    if (want || window.location.hash === "#quote-form") {
      // slight delay so layout is ready
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        // highlight briefly
        el.classList.add("ring-2", "ring-green", "ring-offset-2");
        const t = window.setTimeout(() => {
          el.classList.remove("ring-2", "ring-green", "ring-offset-2");
        }, 1800);
        return () => window.clearTimeout(t);
      });
    }
  }, [search]);

  return null;
}
