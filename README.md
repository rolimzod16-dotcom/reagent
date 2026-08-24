# REAGENT / РЕАГЕНТ

B2B medical products platform — catalog, product information, brands, articles, and **price on request** inquiries.

## Stage 1

- Bilingual RU / EN (`/ru`, `/en`)
- Design system: white + green
- Prisma data model (products, categories, manufacturers, inquiries, articles…)
- Homepage, catalog filters, product pages, brands, content pages
- Quote request form → stored inquiries → `/admin` list
- SEO: metadata, sitemap, robots, hreflang alternates, Product JSON-LD
- Curated seed catalog (~22 products) — **not** scraped prices/specs from references

## Run locally

```bash
cd reagent
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → redirects to `/ru`.

Admin inquiries: [http://localhost:3000/admin](http://localhost:3000/admin)

## Stack

Next.js App Router · TypeScript · Tailwind · Prisma · SQLite

## Docs

See `docs/ARCHITECTURE.md` for reference analysis and IA.
