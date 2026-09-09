import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function hashText(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapName(value: string): string[] {
  const words = value.trim().replace(/\s+/g, " ").split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 34 && current) {
      lines.push(current);
      current = word;
      if (lines.length === 2) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < 3) lines.push(current);
  return lines.slice(0, 3);
}

function visualKind(name: string): "kit" | "bottle" | "microscope" | "pipette" | "machine" | "tube" {
  const text = name.toLowerCase();
  if (/микроскоп|microscope/.test(text)) return "microscope";
  if (/пипет|дозатор|pipett/.test(text)) return "pipette";
  if (/реагент|набор|тест|антител|антиген|kit|assay/.test(text)) return "kit";
  if (/раствор|масло|вода|кислот|жидк|solution|oil|water/.test(text)) return "bottle";
  if (/пробир|ампул|tube|vial/.test(text)) return "tube";
  return "machine";
}

function illustration(kind: ReturnType<typeof visualKind>, accent: string, hash: number): string {
  const detail = 70 + (hash % 90);
  if (kind === "microscope") return `<g fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"><path d="M365 172l88 88-45 45-88-88z"/><path d="M390 302c-70 15-111 66-102 130 9 65 66 103 143 93"/><path d="M276 531h220M330 476h130"/><circle cx="449" cy="239" r="18" fill="${accent}"/></g>`;
  if (kind === "pipette") return `<g transform="rotate(-34 400 350)" fill="none" stroke="${accent}" stroke-width="13" stroke-linejoin="round"><rect x="350" y="135" width="95" height="320" rx="30"/><rect x="368" y="90" width="59" height="70" rx="15" fill="${accent}"/><path d="M377 455h42l-12 135h-18z"/><path d="M362 265h72M362 310h72"/></g>`;
  if (kind === "bottle") return `<g><rect x="300" y="205" width="205" height="330" rx="35" fill="white" stroke="${accent}" stroke-width="13"/><rect x="338" y="135" width="129" height="82" rx="16" fill="${accent}"/><rect x="325" y="325" width="155" height="105" rx="18" fill="${accent}" opacity=".16"/><path d="M350 377h105" stroke="${accent}" stroke-width="12" stroke-linecap="round"/></g>`;
  if (kind === "tube") return `<g fill="none" stroke="${accent}" stroke-width="12"><path d="M286 164h86v302c0 75-86 75-86 0z" fill="white"/><path d="M428 164h86v302c0 75-86 75-86 0z" fill="white"/><path d="M297 390h64M439 350h64" stroke-width="22" opacity=".35"/><path d="M270 164h118M412 164h118" stroke-linecap="round"/></g>`;
  if (kind === "kit") return `<g><path d="M238 250l162-82 162 82-162 83z" fill="white" stroke="${accent}" stroke-width="12"/><path d="M238 250v220l162 91 162-91V250L400 333z" fill="white" stroke="${accent}" stroke-width="12" stroke-linejoin="round"/><path d="M400 333v228" stroke="${accent}" stroke-width="12"/><rect x="278" y="335" width="82" height="68" rx="12" fill="${accent}" opacity=".18"/><circle cx="493" cy="390" r="${detail / 4}" fill="${accent}" opacity=".32"/></g>`;
  return `<g><rect x="225" y="190" width="350" height="350" rx="42" fill="white" stroke="${accent}" stroke-width="13"/><rect x="270" y="238" width="260" height="145" rx="20" fill="${accent}" opacity=".14"/><circle cx="338" cy="455" r="42" fill="none" stroke="${accent}" stroke-width="13"/><path d="M418 435h100M418 475h72" stroke="${accent}" stroke-width="13" stroke-linecap="round"/><circle cx="488" cy="285" r="18" fill="${accent}"/></g>`;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.slice(0, 120) || "product";
  const rawName = request.nextUrl.searchParams.get("name")?.slice(0, 180) || "REAGENT product";
  const name = escapeXml(rawName);
  const hash = hashText(`${slug}:${rawName}`);
  const accents = ["#159447", "#1677b8", "#3b82c4", "#0f766e", "#15803d", "#2563a7"];
  const accent = accents[hash % accents.length];
  const pale = ["#eefaf2", "#eef7fc", "#f1f8ff", "#ecfdf7"][Math.floor(hash / 7) % 4];
  const lines = wrapName(rawName).map(escapeXml);
  const kind = visualKind(rawName);
  const title = lines.map((line, index) => `<text x="400" y="${670 + index * 30}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#18322a">${line}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800" role="img" aria-label="${name}"><rect width="800" height="800" rx="40" fill="${pale}"/><circle cx="${105 + (hash % 80)}" cy="${110 + (hash % 55)}" r="${55 + (hash % 45)}" fill="${accent}" opacity=".09"/><circle cx="${650 - (hash % 70)}" cy="${130 + (hash % 65)}" r="${35 + (hash % 55)}" fill="${accent}" opacity=".08"/>${illustration(kind, accent, hash)}<rect x="70" y="630" width="660" height="130" rx="26" fill="white" opacity=".94"/>${title}<text x="400" y="748" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="${accent}">REAGENT · ${escapeXml(slug.slice(-18).toUpperCase())}</text></svg>`;
  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
