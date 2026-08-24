/**
 * Move Vector-Best reagent branches under root category "reagents".
 * Leaves threelab equipment under laboratoriya.
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
});

await c.connect();

async function ensureReagents() {
  let r = await c.query(
    `select id, slug, "parentId", published from "Category"
     where slug in ('reagents','reagenty') or "nameRu"='Реагенты'
     order by case when slug='reagents' then 0 else 1 end
     limit 1`
  );
  if (r.rows[0]) {
    const id = r.rows[0].id;
    await c.query(
      `update "Category" set slug='reagents', "nameRu"='Реагенты', "nameEn"='Reagents',
       "parentId"=null, published=true, "sortOrder"=3, "updatedAt"=now()
       where id=$1`,
      [id]
    );
    return id;
  }
  r = await c.query(
    `insert into "Category" (id, slug, "nameRu", "nameEn", "parentId", published, "sortOrder", "createdAt", "updatedAt")
     values (gen_random_uuid()::text, 'reagents', 'Реагенты', 'Reagents', null, true, 3, now(), now())
     returning id`
  );
  return r.rows[0].id;
}

const reagentsId = await ensureReagents();
console.log("reagents root:", reagentsId);

// Top VB branches that should hang under reagents (not equipment)
const moveSlugs = ["vb-immunochemistry", "vb-ptsr", "vb-biokhimiya", "vb-gemostaz", "vb-veterinariya"];

const found = await c.query(
  `select id, slug, "nameRu", "parentId" from "Category" where slug = any($1)`,
  [moveSlugs]
);
console.log(
  "found branches:",
  found.rows.map((r) => `${r.slug} parent=${r.parentId}`)
);

for (const row of found.rows) {
  if (row.parentId === reagentsId) continue;
  await c.query(
    `update "Category" set "parentId"=$1, published=true, "updatedAt"=now() where id=$2`,
    [reagentsId, row.id]
  );
  console.log("moved", row.slug, "-> reagents");
}

// Also move any orphan vb-* that are currently direct children of laboratoriya
const lab = await c.query(
  `select id from "Category" where slug='laboratoriya' limit 1`
);
if (lab.rows[0]) {
  const underLab = await c.query(
    `select id, slug, "nameRu" from "Category"
     where "parentId"=$1 and slug like 'vb-%'`,
    [lab.rows[0].id]
  );
  for (const row of underLab.rows) {
    await c.query(
      `update "Category" set "parentId"=$1, published=true, "updatedAt"=now() where id=$2`,
      [reagentsId, row.id]
    );
    console.log("moved from laboratoriya", row.slug);
  }
}

const kids = await c.query(
  `select slug, "nameRu" from "Category" where "parentId"=$1 order by "sortOrder", slug`,
  [reagentsId]
);
console.log(
  "reagents children:",
  kids.rows.map((r) => r.slug)
);

const counts = await c.query(`
  with recursive tree as (
    select id from "Category" where id=$1
    union all
    select c.id from "Category" c join tree t on c."parentId"=t.id
  )
  select count(*)::int as n from "Product" p
  where p.published=true and p."categoryId" in (select id from tree)
`, [reagentsId]);
console.log("reagents tree product count:", counts.rows[0].n);

await c.end();
console.log("DONE");
