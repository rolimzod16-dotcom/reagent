const duplicatedSourceImages = new Set<string>([
  // Generated from the production catalog audit. Keep normalized source URLs here.
  "https://vector-best.ru/upload/resize_cache/iblock/a8c/nolx7gsmrqkozcm7sx66zs1sbowbyg7r/400_550_1/Vebinar_oblozhka_katalog_01.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/b89/xn7p0rn2zircs17ucqh84osrfcxtxzk6/400_550_1/AB_postranichno_sayt.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/dae/dhj5eviocpejkkstscjn2g2fawh02jh1/400_550_1/Vebinar_oblozhka_katalog_20_01.jpg",
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
  "https://vector-best.ru/upload/resize_cache/iblock/558/amenu181mv3movrhdhn2ta7873tfi75r/400_550_1/Aspect_veterinariya_2025.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/7c7/r6zilzd7lgvj56oa5818w6u2i2f1v8o5/400_550_1/Metody-diagnostiki-virusa-leykoza-krupnogo-rogatogo-skota_oblozhka-na-sayt_.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/99f/9e7r5en08nls891a9eaj324awni57608/400_550_1/AEK_IFA_listovka_A5.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/077/024b34d9tvh6xth1fwmj3xnk36xa8l19/400_550_1/Leykemiya-i-immunodefitsit-IFA_sayt_Montazhnaya-oblast-1_Montazhnaya-oblast-1.png",
  "https://vector-best.ru/upload/resize_cache/iblock/cd8/9db9qglmb5fwqxcu6vmvz52mujd9681u/400_550_1/Konyunktivit-u-koshek.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/591/giwazqas6jrkiksigmfarwfezepnl0tm/400_550_1/Ptitsy_PTSR_buklet_2025.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/c17/aa2g30y5351a4crq9yk3qa54fn9siinq/400_550_1/ZHvachnye_PTSR_buklet_2025_.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/f37/dn1k06ynp8p53yhtalbuslt97v1h609j/400_550_1/Svini_PTSR_buklet_2025.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/01a/lj1b9nw9ymyagf2gln87d5tko7oie9m0/400_550_1/Vebinar_oblozhka_katalog_10.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/e03/41sw1p2a4p4ns7u5mmo4n43dowijs2df/400_550_1/Kompleksnaya-diagnostika-infektsionnykh-bolezney-koshek.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/62f/agobpwihjckgezui4p00dmcob1nqanfs/400_550_1/Kompleksnaya-diagnostika-infektsionnykh-bolezney-sobak_buklet.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/1c8/87zweplqg2ejzpoi9a6964vtzp0h0pky/400_550_1/D_dimer_listovka_A5.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/a15/qymbsyo97sz7zi9cia31ch5q4tb16a5k/400_550_1/Diagnostika-ateroskleroza_Montazhnaya-oblast-1.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/ab0/od00uux3vuza6yeltekk4q935fpya52o/400_550_1/Vospaleniya_IFA_.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/ca2/qbz3ggxl9a9da2pyhyl0t08hy1qd374g/400_550_1/Vebinar_oblozhka_katalog_14.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/73a/xsg5o97gzav7ekne0hdm2yhn3ok0v6gg/400_550_1/gemoglobin-A1s_11_page_0001.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/173/ihuy0b4dec97r9wij633byfs1lpk02ft/400_550_1/Transferrin.png",
  "https://vector-best.ru/upload/resize_cache/iblock/cef/softwgebc9urilf2gw79us0xvrhca1cg/400_550_1/s-reaktivnyy-belok_pechat.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/2fc/5axjtqnuj4qdiuz8bin9ngubssibhn5b/400_550_1/Ferritin_prevyu.png",
  "https://vector-best.ru/upload/resize_cache/iblock/fa4/vy44c3c6ujr0bjrsqoo7r3xhuy4fmwht/400_550_1/Med.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/c0a/2hdalyekauz0ji7x6a4r9o4qojv4n34x/400_550_1/NZHSS_A4_print.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/347/re37kvzp8uhd59klzwkue54yptw0t3bp/400_550_1/Vebinar_oblozhka_katalog_19.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/798/30bj8j4heqgh1s5rss2k0n6oqippwc9s/400_550_1/TSink.png",
  "https://vector-best.ru/upload/resize_cache/iblock/656/as3d0g72y64ou8q2vkf8b9nhekdkx4m3/400_550_1/LVNP_A4_pechat.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/d96/nr4mj059106qaibpblediilws9r7gmew/400_550_1/S3-i-S4.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/f53/eskcfgpb34gw6fnf19onlo9ifxd9sbvq/400_550_1/Vebinar_oblozhka_katalog_22_01.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/2ba/ozht21fswj8j9rz81tqf0jokq3akr9kz/400_550_1/Vebinar_oblozhka_katalog_5_01.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/a92/ae83f5e5pf0ci7mncq1q9tqk87z8dtot/400_550_1/Vebinar_oblozhka_katalog_23_01.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/ef1/wn8f1i9mc2njokyhkyie3o31sxb0l3ae/400_550_1/Vebinar_oblozhka_katalog_6_01.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/73b/kjyp5eoymd5konjz7ne6d7rfc2p2zp78/400_550_1/Vebinar_oblozhka_katalog_8.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/d49/bdm61pgz4plgi3xhodjlxkqoi4rtd7ts/400_550_1/Vebinar_oblozhka_katalog_01.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/590/476gdqif50xe49loq55kyorzx7454g0s/400_550_1/Aspergillez_prosmotr_.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/725/cashit9gevrejrv678dkwou9eum1bjez/400_550_1/Difteriya_A4_listovka.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/8ff/fq263lrzds1x4hvdwp2p2eb429h956i8/400_550_1/Allergodiagnostika-buklet.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/f63/0684p80ywy5vhlm7gg84x8kjk5w4o25u/400_550_1/Gepatit-D_listovka_pechat.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/139/3u0ezn4c66ht12jdwv4rrngdcxedckx8/400_550_1/Gepatity_buklet_new_.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/8d5/kccoetxuxdmhfnmuc8uxy5c6tp94yrtq/400_550_1/Sifilis.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/66f/1y9so5w04wkyr6u317z85m8kbod0ss5p/400_550_1/Narusheniya_funtsii_nadpochechnikov_postranichno_sayt_.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/2d8/2baca2ea9jaj3b59e5du9rf1obt2l394/400_550_1/Stolbnyak_A4.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/bf0/r0s8lgqplmi411tk695pqmmao12bzjvt/400_550_1/GLPS_oblozhka.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/d94/xnem81d7gc1yqr47gepb1xk2po1sa8u3/400_550_1/Katalog_veb_4_01_zz_01.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/a1b/m0qcnpr1qpnr9j3orooyrshus1zgorns/400_550_1/Vebinar_oblozhka_katalog_2_02.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/903/m59a2lpxu6dw1q6ph0dyz96z4vlqkog1/400_550_1/Vebinar_oblozhka_katalog_3_03.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/8a2/bem4tk889sjw31f5a3ym4dtvlqzd8g20/400_550_1/VICH-buklet_NEW_.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/0d3/jl1pttr97aa3x5gtaa2kr6zdmn1djc2s/400_550_1/Bezymyannyy_8_Montazhnaya-oblast-1.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/38a/2tv7oq9rt1ru3ry4tc3p98cntiasebuj/400_550_1/Enterovirus_prosmotr.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/c34/gncphuy4jun5t5ewpvy137834ak1p4py/400_550_1/Meningity_prosmotr_2_.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/a87/71iri98dno3zcv7e6t9pg0mre9bpw3vo/400_550_1/Vebinar_oblozhka_katalog_9.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/301/iey8l2bnf13lkodh4lvkksgjldidapmz/400_550_1/Vebinar_oblozhka_katalog.png",
  "https://vector-best.ru/upload/resize_cache/iblock/d95/s83m0kqvdsz5a8wtuzag52vyvnfco9hg/400_550_1/Vebinar_oblozhka_katalog_01.png",
  "https://vector-best.ru/upload/resize_cache/iblock/cb1/2ingd9spkentx383hwksnb08bpy7ce13/400_550_1/A4_interleykin_prevyu.png",
  "https://vector-best.ru/upload/resize_cache/iblock/106/ec9b18kirsxqzza343owthpv2465fv81/400_550_1/Listovka_Abakavir_pechat.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/509/glsc5h0c071z7xx0uaal6s0zk0qs98yf/400_550_1/Kardiomarkery_.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/478/dotekbqlhqi42ng31vhomiybn28vxoui/400_550_1/Kandidoz_postranichno_sayt.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/0b1/rq61mng81d2qv2q6i2aw64gzn7xmx18v/400_550_1/VPCH_prosmotr_.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/d7a/m7i1mm7ui0eomzi1u5uqz6k78gq5kmfr/400_550_1/Bioflor_.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/947/k5ohouwjorbyotxodmawtlhh89537ybz/400_550_1/IPPP.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/806/nbkx7dmp613yw04a7cszafwhgsn0brgk/400_550_1/ORVI_2_.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/21d/png9kw2m72tsqefa805r7l2vy98x6kc1/400_550_1/Biomaterial_1.png",
  "https://vector-best.ru/upload/resize_cache/iblock/6ed/9u5xcbcowqabldek90ambvwij23ltiu3/400_550_1/Katalog_veb_4_01_zz_01.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/ecd/bymka711e7o413747ysn4mj4m7wmqi7p/400_550_1/Vebinar_oblozhka_katalog_12.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/0dd/w6c7lw4rmj8nimtki2yokscma0wigyf0/400_550_1/Vebinar_oblozhka_katalog_16.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/655/vb8as98chgahcmzw9vsteaw0te112dg7/400_550_1/Vebinar_oblozhka_katalog_11.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/19e/78f6qczo4ku25l1brbyklpz51baiin6b/400_550_1/TORCH_.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/197/104lds29nxpt01r4l7my690896x77804/400_550_1/Amnio_ekspress_Best_print.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/347/zywuy05wiyxyh6kgrqlc35owuwq07ylh/400_550_1/Issledovanie-donorskoy-krovi-buklet.jpg",
  "https://vector-best.ru/upload/resize_cache/iblock/74d/rumlxjqng43fnu98i28639eodyh01e1o/400_550_1/PTSR_SSZ_art_gipertoniya_prevyu.png",
  "https://vector-best.ru/upload/resize_cache/iblock/0c7/5kegml2frjo37uzk5mfgsuc1vpn7x4ma/400_550_1/RealBest_ONKO-KRAS_print.jpg",
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

export function getProductImageUrl(product: {
  slug: string;
  nameRu: string;
  nameEn: string;
  images: { url: string }[];
}): string {
  const source = product.images[0]?.url?.trim();
  if (source && !duplicatedSourceImages.has(normalizeImageUrl(source))) {
    return source;
  }

  const params = new URLSearchParams({
    slug: product.slug,
    name: product.nameRu || product.nameEn || "REAGENT",
  });
  return `/api/product-visual?${params.toString()}`;
}

export function productUsesGeneratedImage(product: {
  images: { url: string }[];
}): boolean {
  const source = product.images[0]?.url?.trim();
  return !source || duplicatedSourceImages.has(normalizeImageUrl(source));
}
