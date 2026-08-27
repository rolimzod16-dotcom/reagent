import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const dbUrl = (process.env.DIRECT_URL || process.env.DATABASE_URL || "").replace(
  /[?&]sslmode=[^&]+/g,
  ""
);
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 2,
  connectionTimeoutMillis: 20000,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const BASE = "https://www.deznet.ru";
const DELAY = 250;
const EXTRA = {
  oborudovanie_diagnosticheskoe: [
    "avtorefraktometry",
    "anoskopy_i_proktoskopy",
    "negatoskopy",
    "osvetiteli_nalobnye",
    "radioviziografy",
    "shlemy_dlya_eeg",
    "kamertony",
    "plantografy_opredelenie_ploskostopiya",
  ],
  hirurgicheskoe_oborudovanie_i_instrumenty: [
    "elektrohirurgicheskie_apparaty",
    "aspiratory_hirurgicheskie",
  ],
  reanimatsionnoe_oborudovanie: [
    "vozdukhovody_meditsinskie",
    "dykhatelnye_kontury",
    "kislorodnye_ballony",
    "laringoskopicheskie_klinki",
    "maski_anesteziologicheskie",
    "maski_laringealnye",
    "trubki_kislorodnye",
    "trubki_endotrakhealnye_i_dlya_trakheostomii",
  ],
  pribory_izmeritelnye: [
    "dozimetry",
    "barometry",
    "uglomery_meditsinskie",
    "sekundomery",
    "tablitsy",
    "taymery",
  ],
  oborudovanie_dlya_dezinfektsii_i_sterilizatsii: [
    "dezinfektsionnye_kamery",
    "generatory_aerozolnye",
    "parostruynye_apparaty",
    "pechi_meditsinskie",
  ],
  oborudovanie_endoskopicheskoe: [
    "shchiptsy_i_vykusyvateli_dlya_endoskopov",
    "aksessuary_dlya_endoskopov",
    "svetovody_i_istochniki_sveta_dlya_endoskopov",
    "konteynery_i_yemkosti_dlya_endoskopii",
    "shchetki_dlya_endoskopov",
    "tubusy_endoskopicheskie",
    "distalnye_kolpachki",
    "ligatury_i_klipapplikatory_endoskopicheskie",
    "nozhi_endoskopicheskie",
  ],
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function strip(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/ё/g, "e")
    .replace(/а/g, "a")
    .replace(/б/g, "b")
    .replace(/в/g, "v")
    .replace(/г/g, "g")
    .replace(/д/g, "d")
    .replace(/е/g, "e")
    .replace(/ж/g, "zh")
    .replace(/з/g, "z")
    .replace(/и/g, "i")
    .replace(/й/g, "y")
    .replace(/к/g, "k")
    .replace(/л/g, "l")
    .replace(/м/g, "m")
    .replace(/н/g, "n")
    .replace(/о/g, "o")
    .replace(/п/g, "p")
    .replace(/р/g, "r")
    .replace(/с/g, "s")
    .replace(/т/g, "t")
    .replace(/у/g, "u")
    .replace(/ф/g, "f")
    .replace(/х/g, "h")
    .replace(/ц/g, "ts")
    .replace(/ч/g, "ch")
    .replace(/ш/g, "sh")
    .replace(/щ/g, "sch")
    .replace(/ъ|ь/g, "")
    .replace(/ы/g, "y")
    .replace(/э/g, "e")
    .replace(/ю/g, "yu")
    .replace(/я/g, "ya")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
function normName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url, attempt = 1) {
  const abs = url.startsWith("http") ? url : BASE + url;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(abs, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html",
        "Accept-Language": "ru-RU,ru;q=0.9",
      },
    });
    return { status: res.status, body: await res.text() };
  } catch (e) {
    if (attempt < 3) {
      await sleep(700 * attempt);
      return fetchHtml(url, attempt + 1);
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

function extractProducts(body, rootSlug) {
  const out = [];
  const re =
    /class="[^"]*item-title[^"]*"[\s\S]{0,400}?href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(body))) {
    const href = m[1].split("?")[0];
    const nameRu = strip(m[2]);
    if (!href.includes("/catalog/" + rootSlug + "/")) continue;
    if (!/\/\d+\/?$/.test(href)) continue;
    if (!nameRu || nameRu.length < 4) continue;
    out.push({ href, nameRu });
  }
  const seen = new Set();
  return out.filter((p) => {
    if (seen.has(p.href)) return false;
    seen.add(p.href);
    return true;
  });
}

const existing = await prisma.product.findMany({
  select: { nameRu: true, slug: true },
});
const byName = new Map(existing.map((p) => [normName(p.nameRu), true]));
const slugSet = new Set(existing.map((p) => p.slug));
const mfr = await prisma.manufacturer.findFirst({
  where: { name: "REAGENT Partner" },
});

let grand = 0;
for (const [rootSlug, subs] of Object.entries(EXTRA)) {
  const rootCat = await prisma.category.findUnique({ where: { slug: rootSlug } });
  const already = await prisma.product.count({
    where: { source: "deznet", category: { OR: [{ id: rootCat.id }, { parentId: rootCat.id }] } },
  });
  const need = Math.max(0, 100 - already);
  console.log("\n", rootSlug, "have", already, "need", need);
  if (need === 0) continue;
  let added = 0;
  const kids = await prisma.category.findMany({
    where: { parentId: rootCat.id, slug: { in: subs } },
  });
  const bySlug = Object.fromEntries(kids.map((k) => [k.slug, k]));
  for (const subSlug of subs) {
    if (added >= need) break;
    let cat = bySlug[subSlug];
    if (!cat) continue;
    if (!cat.published) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { published: true },
      });
    }
    const path = `/catalog/${rootSlug}/${subSlug}/`;
    let pageItems = [];
    try {
      const { status, body } = await fetchHtml(path);
      await sleep(DELAY);
      if (status === 200) pageItems = extractProducts(body, rootSlug);
    } catch (e) {
      console.warn("fail", path, e.message);
      continue;
    }
    let subAdded = 0;
    for (const it of pageItems) {
      if (added >= need) break;
      const nn = normName(it.nameRu);
      if (byName.has(nn)) continue;
      let slug = `md-${slugify(it.nameRu)}`.slice(0, 80);
      if (slugSet.has(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 4)}`;
      try {
        await prisma.product.create({
          data: {
            slug,
            nameRu: it.nameRu,
            nameEn: it.nameRu,
            shortRu: it.nameRu.slice(0, 160),
            shortEn: it.nameRu.slice(0, 160),
            descriptionRu: `${it.nameRu}. Поставка через РЕАГЕНТ (reagent.tj). Цена по запросу.`,
            descriptionEn: `${it.nameRu}. Supplied via REAGENT. Price on request.`,
            published: true,
            featured: false,
            priceOnRequest: true,
            priceAmount: null,
            source: "deznet",
            categoryId: cat.id,
            manufacturerId: mfr.id,
          },
        });
        byName.set(nn, true);
        slugSet.add(slug);
        added++;
        subAdded++;
        grand++;
      } catch (e) {
        console.warn("create", it.nameRu.slice(0, 30), String(e.message).slice(0, 40));
      }
    }
    console.log(" ", subSlug, "+", subAdded);
  }
  console.log(" added this root", added);
}

console.log("PASS2", grand, "total", await prisma.product.count());
await prisma.$disconnect();
await pool.end();
