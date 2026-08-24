import fs from "fs";
import pg from "pg";

for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  }
}
const url = (process.env.DIRECT_URL || "").replace(/[?&]sslmode=[^&]+/g, "");
const c = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const totals = await c.query(
  `select count(*)::int as n, count(*) filter (where published) as pub from "Product"`
);
console.log("products", totals.rows[0]);

const byRoot = await c.query(`
  with recursive tree as (
    select id, slug, "nameRu", "parentId", id as root_id, slug as root_slug
    from "Category" where "parentId" is null
    union all
    select ch.id, ch.slug, ch."nameRu", ch."parentId", t.root_id, t.root_slug
    from "Category" ch join tree t on ch."parentId"=t.id
  )
  select t.root_slug, r."nameRu",
         count(p.id)::int as products
  from tree t
  join "Category" r on r.id=t.root_id
  left join "Product" p on p."categoryId"=t.id and p.published=true
  group by t.root_slug, r."nameRu"
  having count(p.id)>0
  order by count(p.id) desc
`);
console.log("\n=== products by root ===");
for (const x of byRoot.rows) console.log(x.products, x.nameRu, x.root_slug);

const reags = await c.query(`
  with recursive tree as (
    select id, slug, "nameRu", "parentId", 0 as depth
    from "Category"
    where slug in ('reaktivy_laboratornykh_issledovaniy','reagents')
    union all
    select ch.id, ch.slug, ch."nameRu", ch."parentId", t.depth+1
    from "Category" ch join tree t on ch."parentId"=t.id
  )
  select t.depth, t.slug, t."nameRu",
         (select count(*)::int from "Product" p where p."categoryId"=t.id and p.published) as direct,
         (select count(*)::int from "Category" ch where ch."parentId"=t.id) as kids
  from tree t
  order by t.depth, t."nameRu"
`);
console.log("\n=== reagent tree ===");
for (const x of reags.rows) {
  console.log(
    "  ".repeat(x.depth) +
      `${x.nameRu} [${x.slug}] direct=${x.direct} kids=${x.kids}`
  );
}

const lab = await c.query(`
  with recursive tree as (
    select id, slug, "nameRu", "parentId", 0 as depth
    from "Category" where slug='laboratoriya'
    union all
    select ch.id, ch.slug, ch."nameRu", ch."parentId", t.depth+1
    from "Category" ch join tree t on ch."parentId"=t.id
  )
  select t.depth, t.slug, t."nameRu",
         (select count(*)::int from "Product" p where p."categoryId"=t.id and p.published) as direct,
         (select count(*)::int from "Category" ch where ch."parentId"=t.id) as kids
  from tree t
  where (select count(*) from "Product" p where p."categoryId"=t.id)>0
     or t.depth<=1
  order by t.depth, t."nameRu"
`);
console.log("\n=== lab tree (with products or depth<=1) ===");
for (const x of lab.rows) {
  console.log(
    "  ".repeat(x.depth) +
      `${x.nameRu} [${x.slug}] direct=${x.direct} kids=${x.kids}`
  );
}

await c.end();
