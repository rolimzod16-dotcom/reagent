/**
 * Publish hidden Vector-Best branches (biochem / hemostasis / vet),
 * flatten dummy "Наборы" wrappers, translate leftover Latin labels.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split("\n")) {
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
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PUBLISH = ["vb-biokhimiya", "vb-gemostaz", "vb-veterinariya"];

const RENAMES = [
  {
    slug: "vb-biokhimiya-nabory-nabory-reagentov-v-kartridzhakh-dlya-analizatora-miu",
    nameRu: "Наборы в картриджах для Miura",
    nameEn: "Miura cartridge kits",
  },
  {
    slug: "vb-biokhimiya-nabory-nabory-reagentov-v-kartridzhakh-dlya-analizatora-tau",
    nameRu: "Наборы в картриджах для Taurus",
    nameEn: "Taurus cartridge kits",
  },
  {
    slug: "vb-biokhimiya-nabory-nabory-reagentov-v-kartridzhakh-dlya-analizatora-va4",
    nameRu: "Наборы в картриджах для VA400",
    nameEn: "VA400 cartridge kits",
  },
  {
    slug: "vb-biokhimiya-nabory-nabory-reagentov-v-kartridzhakh-dlya-analizatorov-se",
    nameRu: "Наборы в картриджах для Aspekt",
    nameEn: "Aspekt cartridge kits",
  },
  {
    slug: "vb-biokhimiya-nabory-promyvochnye-rastvory-vse",
    nameRu: "Промывочные растворы",
    nameEn: "Wash solutions",
  },
  {
    slug: "vb-veterinariya-biokhimiya-nabory-reagentov-v-kartridzhakh-dlya-analizato",
    nameRu: "Наборы в картриджах для Aspekt Mini",
    nameEn: "Aspekt Mini cartridge kits",
  },
  {
    slug: "vb-veterinariya-ifa-gormony",
    nameRu: "Гормоны",
    nameEn: "Hormones",
  },
  {
    slug: "vb-veterinariya-ifa-infektsionnye-bolezni-domashney-ptitsy",
    nameRu: "Инфекционные болезни домашней птицы",
    nameEn: "Poultry infectious diseases",
  },
  {
    slug: "vb-veterinariya-ifa-infektsionnye-bolezni-neskolkikh-vidov-zhivotnykh",
    nameRu: "Инфекционные болезни нескольких видов животных",
    nameEn: "Multi-species infectious diseases",
  },
  {
    slug: "vb-veterinariya-ifa-infektsionnye-bolezni-sobak-i-koshek",
    nameRu: "Инфекционные болезни собак и кошек",
    nameEn: "Canine and feline infectious diseases",
  },
  {
    slug: "vb-veterinariya-ifa-infektsionnye-bolezni-sviney",
    nameRu: "Инфекционные болезни свиней",
    nameEn: "Swine infectious diseases",
  },
  {
    slug: "vb-veterinariya-ifa-infektsionnye-bolezni-zhvachnykh",
    nameRu: "Инфекционные болезни жвачных",
    nameEn: "Ruminant infectious diseases",
  },
  {
    slug: "vb-veterinariya-ptsr-geneticheskie-markery-antibiotikorezistentnosti",
    nameRu: "Генетические маркеры антибиотикорезистентности",
    nameEn: "Antibiotic resistance markers",
  },
  {
    slug: "vb-veterinariya-ptsr-infektsionnye-bolezni-koshek",
    nameRu: "Инфекционные болезни кошек",
    nameEn: "Feline infectious diseases",
  },
  {
    slug: "vb-veterinariya-ptsr-infektsionnye-bolezni-krolikov",
    nameRu: "Инфекционные болезни кроликов",
    nameEn: "Rabbit infectious diseases",
  },
  {
    slug: "vb-veterinariya-ptsr-infektsionnye-bolezni-loshadey",
    nameRu: "Инфекционные болезни лошадей",
    nameEn: "Equine infectious diseases",
  },
  {
    slug: "vb-veterinariya-ptsr-infektsionnye-bolezni-neskolkikh-vidov-zhivotnykh",
    nameRu: "Инфекционные болезни нескольких видов животных",
    nameEn: "Multi-species infectious diseases",
  },
  {
    slug: "vb-veterinariya-ptsr-infektsionnye-bolezni-popugaev",
    nameRu: "Инфекционные болезни попугаев",
    nameEn: "Parrot infectious diseases",
  },
  {
    slug: "vb-veterinariya-ptsr-infektsionnye-bolezni-ptits",
    nameRu: "Инфекционные болезни птиц",
    nameEn: "Avian infectious diseases",
  },
  {
    slug: "vb-veterinariya-ptsr-infektsionnye-bolezni-ryb",
    nameRu: "Инфекционные болезни рыб",
    nameEn: "Fish infectious diseases",
  },
  {
    slug: "vb-veterinariya-ptsr-infektsionnye-bolezni-sivney",
    nameRu: "Инфекционные болезни свиней",
    nameEn: "Swine infectious diseases",
  },
  {
    slug: "vb-veterinariya-ptsr-infektsionnye-bolezni-sobak",
    nameRu: "Инфекционные болезни собак",
    nameEn: "Canine infectious diseases",
  },
  {
    slug: "vb-veterinariya-ptsr-infektsionnye-bolezni-sobak-i-koshek",
    nameRu: "Инфекционные болезни собак и кошек",
    nameEn: "Canine and feline infectious diseases",
  },
  {
    slug: "vb-veterinariya-ptsr-infektsionnye-bolezni-zhvachnykh",
    nameRu: "Инфекционные болезни жвачных",
    nameEn: "Ruminant infectious diseases",
  },
  {
    slug: "vb-veterinariya-ptsr-rastvory-i-komponenty",
    nameRu: "Растворы и компоненты",
    nameEn: "Solutions and components",
  },
  {
    slug: "vb-veterinariya-ptsr-vyyavlenie-vidovoy-prinadlezhnosti-tkaney-zhivotnykh",
    nameRu: "Видовая принадлежность тканей",
    nameEn: "Animal tissue species identification",
  },
];

async function flattenWrapper(wrapperSlug, parentSlug) {
  const wrapper = await prisma.category.findUnique({
    where: { slug: wrapperSlug },
  });
  const parent = await prisma.category.findUnique({
    where: { slug: parentSlug },
  });
  if (!wrapper || !parent) {
    console.log("flatten skip", wrapperSlug, { wrapper: !!wrapper, parent: !!parent });
    return;
  }
  const moved = await prisma.category.updateMany({
    where: { parentId: wrapper.id },
    data: { parentId: parent.id },
  });
  const products = await prisma.product.updateMany({
    where: { categoryId: wrapper.id },
    data: { categoryId: parent.id },
  });
  await prisma.category.update({
    where: { id: wrapper.id },
    data: { published: false },
  });
  console.log(
    "flatten",
    wrapperSlug,
    "→",
    parentSlug,
    "cats",
    moved.count,
    "products",
    products.count
  );
}

try {
  for (const slug of PUBLISH) {
    const r = await prisma.category.updateMany({
      where: { slug },
      data: { published: true },
    });
    console.log("publish", slug, r.count);
  }

  await flattenWrapper("vb-biokhimiya-nabory", "vb-biokhimiya");
  await flattenWrapper("vb-gemostaz-nabory", "vb-gemostaz");

  for (const row of RENAMES) {
    const r = await prisma.category.updateMany({
      where: { slug: row.slug },
      data: { nameRu: row.nameRu, nameEn: row.nameEn },
    });
    console.log("rename", row.slug, r.count, "→", row.nameRu);
  }

  const reagents = await prisma.category.findFirst({
    where: { slug: "reaktivy_laboratornykh_issledovaniy" },
    select: { id: true },
  });
  const children = reagents
    ? await prisma.category.findMany({
        where: { parentId: reagents.id, published: true },
        select: {
          slug: true,
          nameRu: true,
          published: true,
          _count: { select: { products: true, children: true } },
        },
        orderBy: { slug: "asc" },
      })
    : [];
  console.log("REAGENTS CHILDREN", JSON.stringify(children, null, 2));
  console.log("products", await prisma.product.count({ where: { published: true } }));
} finally {
  await prisma.$disconnect();
  await pool.end();
}
