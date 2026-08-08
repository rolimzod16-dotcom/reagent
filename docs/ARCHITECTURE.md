# REAGENT / РЕАГЕНТ — Information Architecture (Stage 1)

## Reference analysis (not copy)

### Skymed.uz
- **Strengths:** Category-first medical equipment navigation (radiology, US, ICU/OR, cardiology, lab…); visual product presentation; callback / inquiry forms; partner logos; professional supplier tone.
- **Adopted ideas:** Clear specialty categories on home; inquiry-first CTAs; equipment-led catalog entry.

### Ro-Chain
- **Strengths:** Deep product taxonomy (OT, ICU, CSSD, imaging); model-oriented product pages; B2B “solutions” grouping; multi-language product lists.
- **Adopted ideas:** Hierarchical catalog (category → products); manufacturer/model fields; hospital equipment depth without checkout.

### Vector-Best
- **Strengths:** Dense lab catalog (reagents, PCR, biochemistry, equipment); documentation links; knowledge/articles hub; manufacturer/product type filters.
- **Adopted ideas:** Separate Brands + Documents + Knowledge/Articles; technical product sections; filterable B2B catalog.

### REAGENT original synthesis
- White-dominant medical UI + strategic green CTAs
- Bilingual RU/EN (`/[locale]/…`)
- **No public prices** — only “Цена по запросу” / “Price on request”
- Quote form binds selected product automatically
- Data-driven catalog (Prisma), not hardcoded product arrays in UI
- Curated seed catalog (representative, non-scraped, no invented certifications)

## Route map

| Path | Purpose |
|------|---------|
| `/{locale}` | Homepage |
| `/{locale}/catalog` | Catalog + filters |
| `/{locale}/catalog/[category]` | Category listing |
| `/{locale}/product/[slug]` | Product page |
| `/{locale}/brands` | Manufacturers list |
| `/{locale}/brands/[slug]` | Manufacturer page |
| `/{locale}/about` | About |
| `/{locale}/solutions` | Medical solutions |
| `/{locale}/articles` | Articles index |
| `/{locale}/articles/[slug]` | Article |
| `/{locale}/documents` | Documents hub |
| `/{locale}/faq` | FAQ |
| `/{locale}/contact` | Contact + consultation |
| `/{locale}/search` | Search results |
| `/api/inquiries` | Quote form POST |
| `/admin` | Admin shell (stage 1: inquiries list) |

Locales: `ru` | `en` (default `ru`)

## User journey

Visitor → Understand REAGENT → Search/Browse → Product → Price on request → Request quote → Inquiry stored for sales

## Design system

- **Primary green:** `#0B6E4F` / `#0D8A62`
- **Background:** white / `#F7FAF8`
- **Text:** slate-900 / slate-600
- **Borders:** slate-200
- Typography: clean sans (system / Geist)
- No glassmorphism, no heavy gradients, minimal radius

## Data model (Prisma)

See `prisma/schema.prisma`: Product, Category, Manufacturer, ProductImage, ProductDocument, ProductSpecification, Inquiry, Article, AdminUser.

## Seed policy

Stage 1 seed: ~18–24 curated representative products across categories.
- No source prices
- No invented certifications or medical claims
- Specs only when generic/safe (product type fields)
- Images: abstract/neutral Unsplash medical/lab (placeholders, not competitor product photos claimed as own)
