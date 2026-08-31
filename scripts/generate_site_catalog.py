# -*- coding: utf-8 -*-
"""Full REAGENT site catalog PDF — all published products from reagent.tj."""
from __future__ import annotations

import json
import os
from collections import OrderedDict
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "site-catalog.json"
OUT_PUBLIC = ROOT / "public" / "catalog" / "katalog-reagent-2026.pdf"
OUT_DOCS = ROOT / "docs" / "katalog-reagent-2026.pdf"

TEAL = colors.HexColor("#0B5E5A")
TEAL_DARK = colors.HexColor("#073E3B")
GREEN = colors.HexColor("#1B7A3D")
INK = colors.HexColor("#1A1A1A")
MUTED = colors.HexColor("#5A5A5A")
LINE = colors.HexColor("#D5DDDC")
ROW_ALT = colors.HexColor("#F3F7F6")
WHITE = colors.white


def register_fonts():
    windir = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"
    pairs = [
        ("Catalog", "arial.ttf"),
        ("Catalog-Bold", "arialbd.ttf"),
    ]
    for name, fn in pairs:
        p = windir / fn
        if not p.exists():
            raise SystemExit(f"Need font {p}")
        pdfmetrics.registerFont(TTFont(name, str(p)))


def esc(s) -> str:
    return (
        str(s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def styles():
    return {
        "h1": ParagraphStyle(
            "h1",
            fontName="Catalog-Bold",
            fontSize=15,
            leading=19,
            textColor=TEAL_DARK,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2",
            fontName="Catalog-Bold",
            fontSize=10.5,
            leading=13,
            textColor=TEAL,
            spaceBefore=8,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "body",
            fontName="Catalog",
            fontSize=9.5,
            leading=13,
            textColor=INK,
            spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "small",
            fontName="Catalog",
            fontSize=8,
            leading=11,
            textColor=MUTED,
        ),
        "th": ParagraphStyle(
            "th",
            fontName="Catalog-Bold",
            fontSize=7.5,
            leading=10,
            textColor=WHITE,
        ),
        "td": ParagraphStyle(
            "td",
            fontName="Catalog",
            fontSize=7.2,
            leading=9.5,
            textColor=INK,
        ),
        "tdSku": ParagraphStyle(
            "tdSku",
            fontName="Catalog-Bold",
            fontSize=7.2,
            leading=9.5,
            textColor=TEAL_DARK,
        ),
        "toc": ParagraphStyle(
            "toc",
            fontName="Catalog",
            fontSize=10,
            leading=15,
            textColor=INK,
        ),
    }


def header_footer(canvas, doc):
    if canvas.getPageNumber() == 1:
        return
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(TEAL)
    canvas.rect(0, h - 12 * mm, w, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Catalog-Bold", 8)
    canvas.drawString(16 * mm, h - 7.4 * mm, "РЕАГЕНТ  ·  reagent.tj")
    canvas.setFont("Catalog", 8)
    canvas.drawRightString(w - 16 * mm, h - 7.4 * mm, "Каталог продукции 2026")
    canvas.setFillColor(TEAL)
    canvas.rect(0, 0, w, 10 * mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Catalog", 7)
    canvas.drawString(
        16 * mm,
        4 * mm,
        "ООО «Тибби Хуршед»  ·  ЧДММ «Тибби Хуршед»  ·  Душанбе  ·  цена по запросу",
    )
    canvas.drawRightString(w - 16 * mm, 4 * mm, str(canvas.getPageNumber()))
    canvas.restoreState()


def cover_page(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(TEAL_DARK)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.setFillColor(TEAL)
    canvas.rect(0, 0, 10 * mm, h, fill=1, stroke=0)
    canvas.setFillColor(GREEN)
    canvas.rect(w - 10 * mm, 0, 10 * mm, h, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Catalog", 9)
    canvas.drawCentredString(w / 2, h - 28 * mm, "КАТАЛОГ ПРОДУКЦИИ  ·  2026")
    canvas.setFont("Catalog-Bold", 32)
    canvas.drawCentredString(w / 2, h - 52 * mm, "РЕАГЕНТ")
    canvas.setStrokeColor(WHITE)
    canvas.setLineWidth(0.6)
    canvas.line(w / 2 - 40 * mm, h - 58 * mm, w / 2 + 40 * mm, h - 58 * mm)
    canvas.setFont("Catalog", 13)
    canvas.drawCentredString(
        w / 2, h - 72 * mm, "Полный каталог позиций с сайта reagent.tj"
    )
    payload = getattr(doc, "catalog_meta", {}) or {}
    n = payload.get("count", "")
    canvas.setFont("Catalog-Bold", 14)
    if n:
        canvas.drawCentredString(w / 2, h - 92 * mm, f"{n} позиций")
    canvas.setFont("Catalog", 10)
    canvas.drawCentredString(
        w / 2,
        h - 118 * mm,
        "ООО «Тибби Хуршед»  ·  ЧДММ «Тибби Хуршед»",
    )
    canvas.setFont("Catalog", 10)
    canvas.drawCentredString(
        w / 2, h - 128 * mm, "Душанбе, Республика Таджикистан"
    )
    canvas.setFont("Catalog", 10)
    canvas.drawCentredString(
        w / 2,
        48 * mm,
        "Реагенты  ·  лабораторное оборудование  ·  расходники  ·  медтехника",
    )
    canvas.setFont("Catalog", 9)
    canvas.drawCentredString(
        w / 2, 32 * mm, "Цена по запросу  ·  B2B-поставка через РЕАГЕНТ"
    )
    canvas.setFont("Catalog", 8)
    canvas.drawCentredString(w / 2, 18 * mm, "www.reagent.tj")
    canvas.restoreState()


def load_products():
    if not DATA.exists():
        raise SystemExit(f"Missing {DATA} — run node scripts/dump-site-catalog.mjs")
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    items = payload.get("items") or []
    seen = set()
    out = []
    for p in items:
        name = str(p.get("nameRu") or "").strip()
        if not name:
            continue
        key = (str(p.get("sku") or "").strip().upper(), name.lower(), p.get("slug"))
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return out, payload


def group(products):
    roots: OrderedDict[str, dict] = OrderedDict()
    order = []
    for p in products:
        root = p.get("rootName") or "Прочее"
        if root not in roots:
            roots[root] = {"sort": p.get("rootSort", 999), "leaves": OrderedDict()}
            order.append(root)
        leaf = p.get("leafName") or root
        if leaf == root and p.get("path") and " / " in p["path"]:
            leaf = p["path"].split(" / ")[-1]
        roots[root]["leaves"].setdefault(leaf, []).append(p)
    sorted_roots = sorted(roots.items(), key=lambda kv: (kv[1]["sort"], kv[0]))
    return OrderedDict((k, v["leaves"]) for k, v in sorted_roots)


def catalog_no(p) -> str:
    return (p.get("sku") or p.get("model") or "").strip() or "—"


def make_table(rows, st):
    header = [
        Paragraph("Кат. №", st["th"]),
        Paragraph("Наименование", st["th"]),
        Paragraph("Производитель", st["th"]),
        Paragraph("Фасовка /<br/>определений", st["th"]),
    ]
    data = [header]
    for p in rows:
        data.append(
            [
                Paragraph(esc(catalog_no(p)), st["tdSku"]),
                Paragraph(esc(p.get("nameRu") or ""), st["td"]),
                Paragraph(esc(p.get("manufacturer") or "—"), st["td"]),
                Paragraph(esc(p.get("qty") or "—"), st["td"]),
            ]
        )
    col_w = [26 * mm, 84 * mm, 38 * mm, 30 * mm]
    tbl = Table(data, colWidths=col_w, repeatRows=1)
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), TEAL),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3.5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3.5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("GRID", (0, 0), (-1, -1), 0.3, LINE),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            cmds.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT))
    tbl.setStyle(TableStyle(cmds))
    return tbl


def build():
    register_fonts()
    st = styles()
    products, payload = load_products()
    grouped = group(products)
    total = len(products)

    OUT_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    OUT_DOCS.parent.mkdir(parents=True, exist_ok=True)

    doc = BaseDocTemplate(
        str(OUT_PUBLIC),
        pagesize=A4,
        title="Каталог продукции РЕАГЕНТ 2026",
        author="ООО «Тибби Хуршед» (РЕАГЕНТ)",
        subject="Полный каталог позиций reagent.tj. Цена по запросу.",
        creator="РЕАГЕНТ / reagent.tj",
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=18 * mm,
        bottomMargin=16 * mm,
    )
    doc.catalog_meta = {"count": total}
    w, h = A4
    cover_frame = Frame(0, 0, w, h, id="cover")
    inner = Frame(16 * mm, 16 * mm, w - 32 * mm, h - 34 * mm, id="inner")
    doc.addPageTemplates(
        [
            PageTemplate(id="cover", frames=[cover_frame], onPage=cover_page),
            PageTemplate(id="inner", frames=[inner], onPage=header_footer),
        ]
    )

    story = [NextPageTemplate("inner"), PageBreak()]
    story.append(Paragraph("О каталоге", st["h1"]))
    story.append(
        Paragraph(
            "Настоящий файл — полный каталог опубликованных позиций "
            "на сайте <b>www.reagent.tj</b> (бренд <b>РЕАГЕНТ</b>, "
            "ООО «Тибби Хуршед» / ЧДММ «Тибби Хуршед», Душанбе). "
            "Состав соответствует витрине сайта на дату выгрузки.",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "Цены в каталоге не публикуются. Коммерческие условия — "
            "по запросу через форму на сайте или e-mail reagenttj@gmail.com.",
            st["body"],
        )
    )
    story.append(
        Paragraph(f"Всего позиций в настоящем издании: <b>{total}</b>.", st["body"])
    )
    by_root = payload.get("byRoot") or {}
    if by_root:
        story.append(Paragraph("Состав по разделам сайта", st["h2"]))
        for name, n in by_root.items():
            story.append(Paragraph(f"• {esc(name)} — {n}", st["small"]))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph("Поставщик", st["h2"]))
    story.append(
        Paragraph(
            "<b>ООО «Тибби Хуршед»</b> / ЧДММ «Тибби Хуршед», бренд РЕАГЕНТ. "
            "Душанбе и регионы Таджикистана. Сайт: www.reagent.tj",
            st["body"],
        )
    )

    story.append(PageBreak())
    story.append(Paragraph("Содержание", st["h1"]))
    for root, leaves in grouped.items():
        n = sum(len(v) for v in leaves.values())
        story.append(
            Paragraph(f"<b>{esc(root)}</b> — {n} позиций", st["toc"])
        )
        for leaf, rows in leaves.items():
            if leaf == root:
                continue
            story.append(Paragraph(f"  {esc(leaf)} ({len(rows)})", st["small"]))

    for root, leaves in grouped.items():
        story.append(PageBreak())
        story.append(Paragraph(esc(root), st["h1"]))
        for leaf, rows in leaves.items():
            rows_sorted = sorted(
                rows,
                key=lambda x: (
                    catalog_no(x),
                    x.get("nameRu") or "",
                ),
            )
            heading = Paragraph(esc(leaf), st["h2"])
            tbl = make_table(rows_sorted, st)
            if len(rows_sorted) <= 8:
                story.append(KeepTogether([heading, tbl]))
            else:
                story.append(heading)
                story.append(tbl)

    doc.build(story)
    OUT_DOCS.write_bytes(OUT_PUBLIC.read_bytes())
    print("wrote", OUT_PUBLIC, "and", OUT_DOCS, "products", total)


if __name__ == "__main__":
    build()
