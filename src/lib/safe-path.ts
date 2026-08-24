/** Client-side open-redirect guard (mirror of server safeRedirectPath). */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback: string
): string {
  if (!next) return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  return trimmed.slice(0, 500);
}
