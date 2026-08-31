import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  adminPasswordOk,
  getTelegramBotToken,
  sendTelegramText,
  telegramWebhookSecret,
} from "@/lib/telegram";
import { rateLimit, secureEqual } from "@/lib/security";

export const runtime = "nodejs";

type TgMessage = {
  chat?: { id?: number };
  from?: { username?: string; first_name?: string };
  text?: string;
};

function verifySecret(req: Request): boolean {
  const expected = telegramWebhookSecret();
  const got = req.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!expected || !got) return false;
  return secureEqual(got, expected);
}

export async function POST(req: Request) {
  if (!getTelegramBotToken()) {
    return NextResponse.json({ ok: true });
  }
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { message?: TgMessage } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = body.message;
  const chatId = msg?.chat?.id;
  const text = (msg?.text || "").trim();
  if (!chatId || !text) return NextResponse.json({ ok: true });

  const chat = String(chatId);
  const rl = rateLimit(`tg:${chat}`, 30, 15 * 60 * 1000);
  if (!rl.ok) {
    await sendTelegramText(chat, "Слишком много запросов. Подождите минуту.");
    return NextResponse.json({ ok: true });
  }

  const existing = await prisma.telegramSubscriber.findUnique({
    where: { chatId: chat },
  });
  const cmd = text.split(/\s+/)[0].toLowerCase();

  if (cmd === "/start" || cmd === "/help") {
    if (existing) {
      await sendTelegramText(
        chat,
        "Вы уже подписаны на заявки РЕАГЕНТ.\n\nНовые заявки с сайта будут приходить сюда с полной анкетой.\n\n/stop — отписаться"
      );
    } else {
      await sendTelegramText(
        chat,
        "Бот заявок <b>РЕАГЕНТ</b>.\n\nОтправьте пароль админ-панели сайта (тот же, что вводите на /admin), чтобы получать уведомления о заявках.",
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (cmd === "/stop") {
    if (existing) {
      await prisma.telegramSubscriber.delete({ where: { chatId: chat } });
    }
    await sendTelegramText(chat, "Подписка снята. Чтобы включить снова — /start и пароль.");
    return NextResponse.json({ ok: true });
  }

  if (existing) {
    await sendTelegramText(
      chat,
      "Вы подписаны. Новые заявки приходят автоматически.\n/stop — отписаться"
    );
    return NextResponse.json({ ok: true });
  }

  const pwdRl = rateLimit(`tg-pwd:${chat}`, 8, 15 * 60 * 1000);
  if (!pwdRl.ok) {
    await sendTelegramText(chat, "Слишком много попыток пароля. Подождите 15 минут.");
    return NextResponse.json({ ok: true });
  }

  if (!adminPasswordOk(text)) {
    await sendTelegramText(chat, "Неверный пароль. Это тот же ключ, что для входа в админку сайта.");
    return NextResponse.json({ ok: true });
  }

  await prisma.telegramSubscriber.upsert({
    where: { chatId: chat },
    create: {
      chatId: chat,
      username: msg?.from?.username || null,
      firstName: msg?.from?.first_name || null,
    },
    update: {
      username: msg?.from?.username || null,
      firstName: msg?.from?.first_name || null,
    },
  });

  await sendTelegramText(
    chat,
    "Пароль принят. Этот чат будет получать <b>все заявки</b> с сайта: контакты, товары, количество и комментарий.\n\n/stop — отписаться"
  );
  return NextResponse.json({ ok: true });
}
