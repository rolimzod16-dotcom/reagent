import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAdminKey, secureEqual } from "@/lib/security";
import { SITE_URL } from "@/lib/site";

type InquiryItem = {
  productId?: string | null;
  productName?: string;
  sku?: string | null;
  qty?: string | null;
};

export function getTelegramBotToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t && t.includes(":") ? t : null;
}

export function telegramWebhookSecret(): string {
  if (process.env.TELEGRAM_WEBHOOK_SECRET?.trim()) {
    return process.env.TELEGRAM_WEBHOOK_SECRET.trim();
  }
  const seed = process.env.AUTH_SECRET || "reagent-telegram";
  return createHash("sha256")
    .update(`${seed}:telegram-webhook`, "utf8")
    .digest("hex")
    .slice(0, 48);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function telegramApi(method: string, payload: Record<string, unknown>) {
  const token = getTelegramBotToken();
  if (!token) return { ok: false as const, error: "no token" };
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
  };
  if (!res.ok || !data.ok) {
    return { ok: false as const, error: data.description || `http ${res.status}` };
  }
  return { ok: true as const };
}

export async function sendTelegramText(chatId: string, html: string) {
  const chunks: string[] = [];
  let rest = html;
  while (rest.length > 4000) {
    let cut = rest.lastIndexOf("\n", 4000);
    if (cut < 1000) cut = 4000;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) chunks.push(rest);
  for (const text of chunks) {
    const r = await telegramApi("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    if (!r.ok) return r;
  }
  return { ok: true as const };
}

export function adminPasswordOk(input: string): boolean {
  const expected = getAdminKey();
  if (!expected) return false;
  return secureEqual(input.trim(), expected);
}

export async function formatInquiryTelegram(inquiryId: string): Promise<string | null> {
  const row = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: {
      product: { select: { slug: true, sku: true, nameRu: true, nameEn: true } },
    },
  });
  if (!row) return null;

  let items: InquiryItem[] = [];
  if (row.itemsJson) {
    try {
      items = JSON.parse(row.itemsJson) as InquiryItem[];
    } catch {
      items = [];
    }
  }
  if (items.length === 0 && row.productName) {
    items = [
      {
        productId: row.productId,
        productName: row.productName,
        sku: row.product?.sku || null,
        qty: row.quantity || "1",
      },
    ];
  }

  const slugs = new Map<string, string>();
  const ids = items.map((i) => i.productId).filter((id): id is string => !!id);
  if (ids.length) {
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true },
    });
    for (const p of products) slugs.set(p.id, p.slug);
  }
  if (row.productId && row.product?.slug) slugs.set(row.productId, row.product.slug);

  const locale = row.locale === "en" ? "en" : "ru";
  const when = new Date(row.createdAt).toLocaleString("ru-RU", {
    timeZone: "Asia/Dushanbe",
    dateStyle: "short",
    timeStyle: "medium",
  });
  const urgency =
    row.urgency === "urgent" ? "СРОЧНО" : "обычная";
  const lines: string[] = [
    `<b>Новая заявка РЕАГЕНТ</b>`,
    `<code>${escapeHtml(row.id)}</code>`,
    `${escapeHtml(when)} (Душанбе)`,
    `Срочность: <b>${urgency}</b> · язык: ${locale}`,
    "",
    `<b>Контакты</b>`,
    `Имя: ${escapeHtml(row.name)}`,
  ];
  if (row.company) lines.push(`Компания: ${escapeHtml(row.company)}`);
  lines.push(`Телефон: ${escapeHtml(row.phone)}`);
  lines.push(`Email: ${escapeHtml(row.email)}`);
  if (row.city) lines.push(`Город: ${escapeHtml(row.city)}`);

  lines.push("", `<b>Товары</b>`);
  if (items.length === 0) {
    lines.push("Без конкретной позиции (общая консультация)");
  } else {
    items.forEach((item, idx) => {
      const name = escapeHtml(item.productName || row.productName || "товар");
      const sku = item.sku ? ` · арт. ${escapeHtml(item.sku)}` : "";
      const qty = escapeHtml(String(item.qty || "1"));
      lines.push(`${idx + 1}. ${name}${sku}`);
      lines.push(`    кол-во: ${qty}`);
      const slug = item.productId ? slugs.get(item.productId) : undefined;
      if (slug) {
        lines.push(`    ${SITE_URL}/${locale}/product/${slug}`);
      }
    });
  }
  if (row.quantity && items.length === 0) {
    lines.push(`Количество: ${escapeHtml(row.quantity)}`);
  }
  if (row.message) {
    lines.push("", `<b>Комментарий</b>`, escapeHtml(row.message));
  }
  lines.push("", `Админка: ${SITE_URL}/admin`);
  return lines.join("\n");
}

export async function notifyInquirySubscribers(inquiryId: string) {
  if (!getTelegramBotToken()) return;
  const html = await formatInquiryTelegram(inquiryId);
  if (!html) return;
  const subs = await prisma.telegramSubscriber.findMany();
  if (subs.length === 0) return;
  await Promise.allSettled(
    subs.map((s) => sendTelegramText(s.chatId, html))
  );
}
