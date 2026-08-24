/**
 * Make the live catalog logical for REAGENT:
 * - keep categories that actually have products
 * - hide empty Deznet leaves
 * - flatten duplicate "Реагенты" nest
 * - rename main reagents root
 */
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
await c.query("begin");

const reaktivy = await c.query(
  `select id from "Category" where slug='reaktivy_laboratornykh_issledovaniy'`
);
const reagents = await c.query(
  `select id, "parentId" from "Category" where slug='reagents'`
);

if (reaktivy.rows[0] && reagents.rows[0]) {
  const rid = reaktivy.rows[0].id;
  const nested = reagents.rows[0];
  if (nested.parentId === rid) {
    await c.query(
      `update "Category" set "parentId"=$1, "updatedAt"=now()
       where "parentId"=$2`,
      [rid, nested.id]
    );
    await c.query(
      `update "Product" set "categoryId"=$1, "updatedAt"=now()
       where "categoryId"=$2`,
      [rid, nested.id]
    );
    await c.query(
      `update "Category" set published=false, "updatedAt"=now() where id=$1`,
      [nested.id]
    );
    console.log("flattened nested reagents into main reagents root");
  }
}

await c.query(`
  update "Category"
  set "nameRu"='Реагенты',
      "nameEn"='Reagents',
      "updatedAt"=now()
  where slug='reaktivy_laboratornykh_issledovaniy'
`);

await c.query(`
  with recursive tree as (
    select id, id as root from "Category"
    union all
    select ch.id, t.root
    from "Category" ch
    join tree t on ch."parentId" = t.id
  ),
  counts as (
    select t.root as id, count(p.id)::int as n
    from tree t
    left join "Product" p on p."categoryId"=t.id and p.published=true
    group by t.root
  )
  update "Category" c
  set published = (coalesce(counts.n,0) > 0),
      "updatedAt"=now()
  from counts
  where c.id = counts.id
`);

const FIRST = [
  "reaktivy_laboratornykh_issledovaniy",
  "laboratoriya",
];
await c.query(
  `
  with recursive tree as (
    select id, id as root_id from "Category" where "parentId" is null
    union all
    select ch.id, t.root_id from "Category" ch join tree t on ch."parentId"=t.id
  ),
  prod as (
    select t.root_id, count(p.id)::int as n
    from tree t
    left join "Product" p on p."categoryId"=t.id and p.published=true
    group by t.root_id
  ),
  ranked as (
    select c.id,
      row_number() over (
        order by
          case c.slug
            ${FIRST.map((s, i) => `when '${s}' then ${i + 1}`).join("\n            ")}
            else 50
          end,
          coalesce(p.n,0) desc,
          c."nameRu"
      ) as rn
    from "Category" c
    left join prod p on p.root_id=c.id
    where c."parentId" is null and c.published=true
  )
  update "Category" cat
  set "sortOrder"=ranked.rn, "updatedAt"=now()
  from ranked where cat.id=ranked.id
  `
);

await c.query(`
  with recursive tree as (
    select id, id as leaf from "Category"
    union all
    select ch.id, t.leaf from "Category" ch join tree t on ch."parentId"=t.id
  ),
  prod as (
    select t.leaf as cat_id, count(p.id)::int as n
    from tree t
    left join "Product" p on p."categoryId"=t.id and p.published=true
    group by t.leaf
  ),
  ranked as (
    select c.id,
      row_number() over (
        partition by c."parentId"
        order by coalesce(p.n,0) desc, c."nameRu"
      ) as rn
    from "Category" c
    left join prod p on p.cat_id=c.id
    where c."parentId" is not null and c.published=true
  )
  update "Category" cat
  set "sortOrder"=1000+ranked.rn, "updatedAt"=now()
  from ranked where cat.id=ranked.id
`);

await c.query("commit");

const roots = await c.query(`
  with recursive tree as (
    select id, id as root_id from "Category" where "parentId" is null
    union all
    select ch.id, t.root_id from "Category" ch join tree t on ch."parentId"=t.id
  )
  select c."sortOrder", c.slug, c."nameRu", c.published,
    (select count(*)::int from "Category" ch where ch."parentId"=c.id and ch.published) as kids,
    (select count(p.id)::int from tree t
      join "Product" p on p."categoryId"=t.id and p.published
      where t.root_id=c.id) as products
  from "Category" c
  where c."parentId" is null
  order by c.published desc, c."sortOrder", c."nameRu"
`);
console.log("=== ROOTS ===");
for (const x of roots.rows) {
  console.log(
    `${x.published ? "ON " : "off"} ${String(x.sortOrder).padStart(3)} ${String(x.products).padStart(4)}p ${String(x.kids).padStart(2)}k  ${x.nameRu}`
  );
}

const pub = await c.query(
  `select count(*) filter (where published)::int as on,
          count(*) filter (where not published)::int as off
   from "Category"`
);
const prods = await c.query(`select count(*)::int as n from "Product" where published`);
console.log("categories", pub.rows[0], "products", prods.rows[0].n);

const kids = await c.query(`
  select c."nameRu",
    (select count(*)::int from "Product" p where p."categoryId"=c.id) as direct
  from "Category" c
  where c."parentId"=(select id from "Category" where slug='reaktivy_laboratornykh_issledovaniy')
    and c.published=true
  order by c."sortOrder"
`);
console.log("=== reagents children ===");
for (const x of kids.rows) console.log(" ", x.direct, x.nameRu);

await c.end();
