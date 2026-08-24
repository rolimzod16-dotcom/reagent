import pg from "pg";

const pass = "Reagent_tj3883";
const ref = "ycguhqvuixcwmpqlxjif";
const host = "aws-0-ap-northeast-1.pooler.supabase.com";

const urls = [
  ["tx:6543", `postgresql://postgres.${ref}:${pass}@${host}:6543/postgres`],
  ["sess:5432", `postgresql://postgres.${ref}:${pass}@${host}:5432/postgres`],
];

const tablesToCount = [
  "Product",
  "Category",
  "Inquiry",
  "User",
  "Article",
  "Manufacturer",
  "ProductImage",
  "AdminUser",
];

for (const [name, connectionString] of urls) {
  const c = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  try {
    await c.connect();
    const tables = await c.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1`
    );
    const counts = {};
    for (const t of tablesToCount) {
      try {
        const r = await c.query(`select count(*)::int as n from "${t}"`);
        counts[t] = r.rows[0].n;
      } catch {
        counts[t] = "missing";
      }
    }
    const sample = await c.query(
      `select slug, "nameRu", source from "Product" order by "createdAt" desc nulls last limit 3`
    ).catch(() => ({ rows: [] }));
    console.log("OK", name);
    console.log(
      "  tables:",
      tables.rows.map((r) => r.tablename).join(", ") || "(none)"
    );
    console.log("  counts:", JSON.stringify(counts));
    console.log(
      "  sample products:",
      sample.rows.map((r) => `${r.slug}|${r.source}`).join("; ") || "(none)"
    );
    await c.end();
  } catch (e) {
    console.log("FAIL", name, String(e.message || e).slice(0, 200));
  }
}
