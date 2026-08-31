import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  const file = path.join(
    process.cwd(),
    "public",
    "files",
    "katalog-reagent-2026.pdf"
  );
  const data = await readFile(file);
  return new Response(data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="katalog-reagent-2026.pdf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
