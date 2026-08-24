/** Test / placeholder records that should not appear on the storefront or in SEO. */

export function isJunkText(value?: string | null): boolean {
  const s = (value || "").trim().toLowerCase();
  if (!s) return false;
  if (/^qwerty/.test(s)) return true;
  if (/^1212/.test(s)) return true;
  if (/^asdf/.test(s)) return true;
  if (/^test[-_\s]?\d*$/.test(s)) return true;
  return false;
}
