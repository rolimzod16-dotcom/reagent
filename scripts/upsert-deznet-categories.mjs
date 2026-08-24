/**
 * Upsert Deznet category tree into Category table (batched).
 * Does NOT wipe products.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  }
}

const dbUrl = (process.env.DIRECT_URL || process.env.DATABASE_URL || "").replace(
  /[?&]sslmode=[^&]+/g,
  ""
);
const c = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 25000,
  keepAlive: true,
});

const cats = JSON.parse(
  fs.readFileSync(path.join(root, "data", "deznet-categories.json"), "utf8")
);

function nid() {
  return "c" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

const level1 = cats.filter((x) => x.level === 1);
const level2 = cats.filter((x) => x.level >= 2);

await c.connect();

const existing = await c.query(`select slug from "Category"`);
const have = new Set(existing.rows.map((r) => r.slug));

await c.query("begin");

const l1Ids = level1.map((n) => (have.has(n.slug) ? null : nid()));
const l1Slugs = level1.map((n) => n.slug);
const l1Ru = level1.map((n) => n.nameRu);
const l1En = level1.map((n) => n.nameEn || n.nameRu);
const l1Sort = level1.map((_, i) => 500 + i);

await c.query(
  `insert into "Category"
     (id, slug, "nameRu", "nameEn", "descriptionRu", "descriptionEn",
      "parentId", published, "sortOrder", "createdAt", "updatedAt")
   select
     coalesce(c.id, v.id),
     v.slug,
     v.name_ru,
     v.name_en,
     'Раздел каталога: ' || v.name_ru,
     v.name_en,
     null,
     true,
     v.sort,
     coalesce(c."createdAt", now()),
     now()
   from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])
     as v(id, slug, name_ru, name_en, sort)
   left join "Category" c on c.slug = v.slug
   on conflict (slug) do update set
     "nameRu" = excluded."nameRu",
     "nameEn" = excluded."nameEn",
     published = true,
     "updatedAt" = now()
  [
    l1Ids.map((id, i) => id || "tmp-" + l1Slugs[i]),
    l1Slugs,
    l1Ru,
    l1En,
    l1Sort,
  ]
);

const parentRows = await c.query(
  `select slug, id from "Category" where slug = any($1::text[])`,
  [l1Slugs]
);
const slugToId = Object.fromEntries(parentRows.rows.map((r) => [r.slug, r.id]));
const pathToId = {};
for (const n of level1) pathToId[n.path] = slugToId[n.slug];

const l2Ids = level2.map((n) => (have.has(n.slug) ? "tmp-" + n.slug : nid()));
const l2Slugs = level2.map((n) => n.slug);
const l2Ru = level2.map((n) => n.nameRu);
const l2En = level2.map((n) => n.nameEn || n.nameRu);
const l2Parent = level2.map((n) => pathToId[n.parentPath] || null);
const l2Sort = level2.map((_, i) => 100 + i);

await c.query(
  `insert into "Category"
     (id, slug, "nameRu", "nameEn", "descriptionRu", "descriptionEn",
      "parentId", published, "sortOrder", "createdAt", "updatedAt")
   select
     coalesce(c.id, v.id),
     v.slug,
     v.name_ru,
     v.name_en,
     null,
     v.name_en,
     v.parent_id,
     true,
     v.sort,
     coalesce(c."createdAt", now()),
     now()
   from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::int[])
     as v(id, slug, name_ru, name_en, parent_id, sort)
   left join "Category" c on c.slug = v.slug
   on conflict (slug) do update set
     "nameRu" = excluded."nameRu",
     "nameEn" = excluded."nameEn",
     published = true,
     "updatedAt" = now()
  [l2Ids, l2Slugs, l2Ru, l2En, l2Parent, l2Sort]
);

await c.query("commit");

const roots = await c.query(
  `select count(*)::int as n from "Category" where "parentId" is null and published=true`
);
const subs = await c.query(
  `select count(*)::int as n from "Category" where "parentId" is not null and published=true`
);

console.log(
  JSON.stringify(
    {
      json: { roots: level1.length, subs: level2.length },
      db: { roots: roots.rows[0].n, subs: subs.rows[0].n },
    },
    null,
    2
  )
);

await c.end();
