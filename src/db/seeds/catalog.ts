export type CatalogSeedCollection = {
  description: string;
  name: string;
  slug: string;
  sortOrder: number;
  tagline: string;
};

export type CatalogSeedProduct = {
  collectionSlug: string;
  name: string;
  slug: string;
};

export type CatalogSeedSku = {
  compareAtPriceSatang: number | null;
  name: string;
  priceSatang: number;
  productSlugs: readonly string[];
  skuCode: string;
  skuType: "single" | "collection" | "bundle";
  slug: string;
};

export const catalogSeedCollections: readonly CatalogSeedCollection[] = [
  {
    description: "CRUIZCTRL ReShade preset collection for FiveM.",
    name: "CRUIZCTRL",
    slug: "cruizctrl",
    sortOrder: 10,
    tagline: "10 PRESETS",
  },
  {
    description: "PRISMUTE ReShade preset collection for FiveM.",
    name: "PRISMUTE",
    slug: "prismute",
    sortOrder: 20,
    tagline: "5 PRESETS",
  },
  {
    description: "SEVORA ReShade preset collection for FiveM.",
    name: "SEVORA",
    slug: "sevora",
    sortOrder: 30,
    tagline: "7 DAYS · 7 MOODS",
  },
] as const;

const cruizctrlProducts = Array.from({ length: 10 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  const name = `Cruizctrl${number}`;

  return {
    collectionSlug: "cruizctrl",
    name,
    slug: `cruizctrl-${number}`,
  };
});

const prismuteProducts = Array.from({ length: 5 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  const name = `Prismute${number}`;

  return {
    collectionSlug: "prismute",
    name,
    slug: `prismute-${number}`,
  };
});

const sevoraProducts = [
  "Monday Mellow",
  "Tuesday Rose",
  "Wednesday Sage",
  "Thursday Amber",
  "Friday Azure",
  "Saturday Violet",
  "Sunday Scarlet",
].map((name) => ({
  collectionSlug: "sevora",
  name,
  slug: name.toLowerCase().replaceAll(" ", "-"),
}));

export const catalogSeedProducts: readonly CatalogSeedProduct[] = [
  ...cruizctrlProducts,
  ...prismuteProducts,
  ...sevoraProducts,
];

const productsByCollection = (collectionSlug: string) =>
  catalogSeedProducts
    .filter((product) => product.collectionSlug === collectionSlug)
    .map((product) => product.slug);

const singleSkus: readonly CatalogSeedSku[] = catalogSeedProducts.map(
  (product) => {
    const collectionCode =
      product.collectionSlug === "cruizctrl"
        ? "CC"
        : product.collectionSlug === "prismute"
          ? "PM"
          : "SV";
    const suffix =
      collectionCode === "SV"
        ? product.name.split(" ")[0]?.slice(0, 3).toUpperCase()
        : product.slug.split("-").at(-1)?.toUpperCase();

    return {
      compareAtPriceSatang: null,
      name: product.name,
      priceSatang: 4_900,
      productSlugs: [product.slug],
      skuCode: `XRZT-${collectionCode}-${suffix}`,
      skuType: "single",
      slug: `${product.slug}-single`,
    };
  },
);

export const catalogSeedSkus: readonly CatalogSeedSku[] = [
  ...singleSkus,
  {
    compareAtPriceSatang: 49_000,
    name: "CRUIZCTRL Full Collection",
    priceSatang: 29_900,
    productSlugs: productsByCollection("cruizctrl"),
    skuCode: "XRZT-CC-FULL",
    skuType: "collection",
    slug: "cruizctrl-full-collection",
  },
  {
    compareAtPriceSatang: 24_500,
    name: "PRISMUTE Full Collection",
    priceSatang: 16_900,
    productSlugs: productsByCollection("prismute"),
    skuCode: "XRZT-PM-FULL",
    slug: "prismute-full-collection",
    skuType: "collection",
  },
  {
    compareAtPriceSatang: 34_300,
    name: "SEVORA Full Collection",
    priceSatang: 22_900,
    productSlugs: productsByCollection("sevora"),
    skuCode: "XRZT-SV-FULL",
    slug: "sevora-full-collection",
    skuType: "collection",
  },
  {
    compareAtPriceSatang: 107_800,
    name: "XCRUIZT Complete Bundle",
    priceSatang: 59_900,
    productSlugs: catalogSeedProducts.map((product) => product.slug),
    skuCode: "XRZT-ALL-FULL",
    slug: "xcruizt-complete-bundle",
    skuType: "bundle",
  },
];

export const catalogSeedVersions = catalogSeedProducts.map((product) => ({
  changelogMd: `Initial release draft for ${product.name}.`,
  productSlug: product.slug,
  releaseNotesMd: `The first ${product.name} package is pending the verified product file and final release notes.`,
  version: "1.0.0",
}));
