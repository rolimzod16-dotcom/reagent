const duplicatedSourceImages = new Set<string>([
  // Generated from the production catalog audit. Keep normalized source URLs here.
  // Removed upstream Vector-Best files: use the resilient generated fallback.
  "https://vector-best.ru/upload/resize_cache/iblock/983/y2vpgban46gymdottzb07km369v54u1o/400_550_1/klech_.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/509/glsc5h0c071z7xx0uaal6s0zk0qs98yf/400_550_1/Kardiomarkery_.jpg",
  "https://www.deznet.ru/upload/dev2fun.imagecompress/webp/iblock/f06/n9nr3fq9e00re9l2sl9vvxu1okvpqr13.webp",
  "https://www.deznet.ru/upload/dev2fun.imagecompress/webp/iblock/d50/xux28rq9gpxkjucerp5tl2o1i1giirpe.webp",
  "https://www.deznet.ru/upload/dev2fun.imagecompress/webp/iblock/68b/47gnlh0l6viz1wdm1uym9b681bh9k0st.webp",
  "https://www.deznet.ru/upload/dev2fun.imagecompress/webp/iblock/af7/3m77h767a7h3gswuab01ru00gkxcne5g.webp",
  "https://www.deznet.ru/upload/dev2fun.imagecompress/webp/iblock/1a0/9cb66uvsoej23de55h99hk9vnaq46h93.webp",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Lille_Mus%C3%A9e_de_l%27Institut_Louis_Pasteur_autoclave.jpg/960px-Lille_Mus%C3%A9e_de_l%27Institut_Louis_Pasteur_autoclave.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/2023_Rt%C4%99ciowy_termometr_lekarski.jpg/960px-2023_Rt%C4%99ciowy_termometr_lekarski.jpg",
  "https://www.deznet.ru/upload/dev2fun.imagecompress/webp/iblock/6fd/xrf7319bw4nv86uxahct9u45vxprni60.webp",
  "https://www.deznet.ru/upload/dev2fun.imagecompress/webp/iblock/879/40n722c5mnm1nm4k5aeu6lsccapmxyh3.webp",
  "https://www.deznet.ru/upload/dev2fun.imagecompress/webp/iblock/d2a/c7a01xno3nmyzlw25vxvtorhpgu68epq.webp",
  "https://threelab.ru/upload/iblock/91b/evmj54o2ujwu004u9edee5xv7to4siry/07918ffc_e929_11ed_9ab5_bc97e1eeb951_0791900c_e929_11ed_9ab5_bc97e1eeb951.resize2.jpg",
  "https://threelab.ru/upload/iblock/349/e8424i71iff96xxy1l8umrs0s7oaxuks/9bdc971d_e884_11ed_9ab5_bc97e1eeb951_9bf76612_e884_11ed_9ab5_bc97e1eeb951.resize2.jpg",
  "https://threelab.ru/upload/iblock/ae2/25d2s5ux8frkjaf40if1r05i6u64gfv2/1R_D092.001_18.0.jpg",
]);

function normalizeImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function isUnreliableStockImage(url: string): boolean {
  if (/^\/catalog\/[^/]+\.(?:avif|jpe?g|png|webp)(?:\?|$)/i.test(url)) {
    return true;
  }
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "images.unsplash.com" ||
      host.endsWith(".unsplash.com") ||
      host.endsWith(".pexels.com") ||
      host.endsWith(".pixabay.com")
    );
  } catch {
    return false;
  }
}

export function generatedProductImageUrl(product: {
  slug: string;
  nameRu: string;
  nameEn: string;
}): string {
  const params = new URLSearchParams({
    slug: product.slug,
    name: product.nameRu || product.nameEn || "REAGENT",
  });
  return `/api/product-visual?${params.toString()}`;
}

export function getProductImageUrl(product: {
  slug: string;
  nameRu: string;
  nameEn: string;
  images: { url: string }[];
}): string {
  const source = product.images[0]?.url?.trim();
  if (
    source &&
    !duplicatedSourceImages.has(normalizeImageUrl(source)) &&
    !isUnreliableStockImage(source)
  ) {
    return source;
  }
  return generatedProductImageUrl(product);
}

export function productUsesGeneratedImage(product: {
  images: { url: string }[];
}): boolean {
  const source = product.images[0]?.url?.trim();
  return (
    !source ||
    duplicatedSourceImages.has(normalizeImageUrl(source)) ||
    isUnreliableStockImage(source)
  );
}
