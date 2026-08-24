/**
 * Pin existing catalog first:
 *   1) Реагенты
 *   2) Лабораторное оборудование
 *   then other roots that already have products
 *   then new Deznet sections (empty) after them.
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

const FIRST = [
  "reaktivy_laboratornykh_issledovaniy",
  "laboratoriya",
];

await c.query("begin");

await c.query(
  `
  with recursive tree as (
    select id, id as root_id from "Category" where "parentId" is null
    union all
    select ch.id, t.root_id
    from "Category" ch
    join tree t on ch."parentId" = t.id
  ),
  prod as (
    select t.root_id, count(*)::int as n
    from "Product" p
    join tree t on t.id = p."categoryId"
    where p.published = true
    group by t.root_id
  ),
  ranked as (
    select
      c.id,
      c.slug,
      coalesce(p.n, 0) as products,
      case c.slug
        ${FIRST.map((s, i) => `when '${s}' then ${i + 1}`).join("\n        ")}
        else 100
      end as pin,
      row_number() over (
        order by
          case c.slug
            ${FIRST.map((s, i) => `when '${s}' then ${i + 1}`).join("\n            ")}
            else 100
          end,
          coalesce(p.n, 0) desc,
          c."nameRu"
      ) as rn
    from "Category" c
    left join prod p on p.root_id = c.id
    where c."parentId" is null
  )
  update "Category" cat
  set "sortOrder" = ranked.rn,
      "updatedAt" = now()
  from ranked
  where cat.id = ranked.id
  `
);

await c.query(`
  with recursive tree as (
    select id, id as leaf from "Category"
    union all
    select ch.id, t.leaf
    from "Category" ch
    join tree t on ch."parentId" = t.id
  ),
  prod as (
    select t.leaf as cat_id, count(*)::int as n
    from "Product" p
    join tree t on t.id = p."categoryId"
    where p.published = true
    group by t.leaf
  ),
  ranked as (
    select
      c.id,
      row_number() over (
        partition by c."parentId"
        order by coalesce(p.n, 0) desc, c."nameRu"
      ) as rn
    from "Category" c
    left join prod p on p.cat_id = c.id
    where c."parentId" is not null
  )
  update "Category" cat
  set "sortOrder" = 1000 + ranked.rn,
      "updatedAt" = now()
  from ranked
  where cat.id = ranked.id
`);

await c.query("commit");

const out = await c.query(`
  with recursive tree as (
    select id, id as root_id from "Category" where "parentId" is null
    union all
    select ch.id, t.root_id from "Category" ch join tree t on ch."parentId" = t.id
  )
  select c."sortOrder", c.slug, c."nameRu",
    coalesce((
      select count(*)::int from "Product" p
      join tree t on t.id = p."categoryId"
      where t.root_id = c.id and p.published = true
    ), 0) as products
  from "Category" c
  where c."parentId" is null
  order by c."sortOrder"
`);

for (const x of out.rows) {
  const tag = x.products > 0 ? "EXISTING" : "NEW";
  console.log(
    `${String(x.sortOrder).padStart(3)} ${tag.padEnd(8)} ${String(x.products).padStart(4)}p  ${x.nameRu}`
  );
}
await c.end();
