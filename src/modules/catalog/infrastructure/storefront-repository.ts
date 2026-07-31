import "server-only";

import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db/client";
import {
  collections,
  productImages,
  products,
  skuProducts,
  skus,
} from "@/db/schema";

export type StoreSku = {
  compareAtPriceSatang: number | null;
  currency: string;
  id: string;
  name: string;
  priceSatang: number;
  skuType: "single" | "collection" | "bundle";
  slug: string;
};

export type StoreProduct = {
  brandName: string;
  canonicalPath: string | null;
  collectionName: string | null;
  collectionSlug: string | null;
  compatibility: unknown;
  description: string;
  id: string;
  images: StoreProductImage[];
  isIndexable: boolean;
  mood: string | null;
  name: string;
  schemaCategory: string;
  seoDescription: string | null;
  seoTitle: string | null;
  shortDescription: string;
  skus: StoreSku[];
  slug: string;
};

export type StoreProductImage = {
  altText: string;
  height: number;
  id: string;
  imageRole: "after" | "before" | "cover" | "gallery" | "og" | "thumbnail";
  sortOrder: number;
  storageUrl: string;
  width: number;
};

type StoreProductRow = Omit<StoreProduct, "images" | "skus"> & {
  skuCompareAtPriceSatang: number | null;
  skuCurrency: string;
  skuId: string;
  skuName: string;
  skuPriceSatang: number;
  skuSlug: string;
  skuType: "single" | "collection" | "bundle";
};

const storeProductSelection = {
  brandName: products.brandName,
  canonicalPath: products.canonicalPath,
  collectionName: collections.name,
  collectionSlug: collections.slug,
  compatibility: products.compatibility,
  description: products.description,
  id: products.id,
  isIndexable: products.isIndexable,
  mood: products.mood,
  name: products.name,
  schemaCategory: products.schemaCategory,
  seoDescription: products.seoDescription,
  seoTitle: products.seoTitle,
  shortDescription: products.shortDescription,
  skuCompareAtPriceSatang: skus.compareAtPriceSatang,
  skuCurrency: skus.currency,
  skuId: skus.id,
  skuName: skus.name,
  skuPriceSatang: skus.priceSatang,
  skuSlug: skus.slug,
  skuType: skus.skuType,
  slug: products.slug,
} as const;

function groupStoreProducts(rows: StoreProductRow[]): StoreProduct[] {
  const grouped = new Map<string, StoreProduct>();

  for (const row of rows) {
    const existing = grouped.get(row.id);
    const sku: StoreSku = {
      compareAtPriceSatang: row.skuCompareAtPriceSatang,
      currency: row.skuCurrency,
      id: row.skuId,
      name: row.skuName,
      priceSatang: row.skuPriceSatang,
      skuType: row.skuType,
      slug: row.skuSlug,
    };

    if (existing) {
      existing.skus.push(sku);
      continue;
    }

    grouped.set(row.id, {
      brandName: row.brandName,
      canonicalPath: row.canonicalPath,
      collectionName: row.collectionName,
      collectionSlug: row.collectionSlug,
      compatibility: row.compatibility,
      description: row.description,
      id: row.id,
      images: [],
      isIndexable: row.isIndexable,
      mood: row.mood,
      name: row.name,
      schemaCategory: row.schemaCategory,
      seoDescription: row.seoDescription,
      seoTitle: row.seoTitle,
      shortDescription: row.shortDescription,
      skus: [sku],
      slug: row.slug,
    });
  }

  return [...grouped.values()];
}

function publishedProductWhere() {
  return and(
    eq(products.status, "published"),
    eq(skus.status, "active"),
    or(
      isNull(products.collectionId),
      eq(collections.status, "published"),
    ),
  );
}

async function loadStoreProducts(
  rows: StoreProductRow[],
): Promise<StoreProduct[]> {
  const grouped = groupStoreProducts(rows);
  if (grouped.length === 0) return grouped;

  const images = await db
    .select({
      altText: productImages.altText,
      height: productImages.height,
      id: productImages.id,
      imageRole: productImages.imageRole,
      productId: productImages.productId,
      sortOrder: productImages.sortOrder,
      storageUrl: productImages.storageUrl,
      width: productImages.width,
    })
    .from(productImages)
    .where(
      inArray(
        productImages.productId,
        grouped.map(({ id }) => id),
      ),
    )
    .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt));
  const productById = new Map(grouped.map((product) => [product.id, product]));

  for (const image of images) {
    if (!image.productId) continue;
    const product = productById.get(image.productId);
    if (!product) continue;
    product.images.push({
      altText: image.altText,
      height: image.height,
      id: image.id,
      imageRole: image.imageRole,
      sortOrder: image.sortOrder,
      storageUrl: image.storageUrl,
      width: image.width,
    });
  }

  return grouped;
}

export async function listStoreProducts(
  collectionSlug?: string,
): Promise<StoreProduct[]> {
  const conditions = collectionSlug
    ? and(
        publishedProductWhere(),
        eq(collections.slug, collectionSlug),
        eq(collections.status, "published"),
      )
    : publishedProductWhere();

  const rows = await db
    .select(storeProductSelection)
    .from(products)
    .leftJoin(collections, eq(collections.id, products.collectionId))
    .innerJoin(skuProducts, eq(skuProducts.productId, products.id))
    .innerJoin(skus, eq(skus.id, skuProducts.skuId))
    .where(conditions)
    .orderBy(asc(products.name), asc(skus.priceSatang));

  return loadStoreProducts(rows);
}

export async function findStoreProductBySlug(
  slug: string,
): Promise<StoreProduct | null> {
  const rows = await db
    .select(storeProductSelection)
    .from(products)
    .leftJoin(collections, eq(collections.id, products.collectionId))
    .innerJoin(skuProducts, eq(skuProducts.productId, products.id))
    .innerJoin(skus, eq(skus.id, skuProducts.skuId))
    .where(and(publishedProductWhere(), eq(products.slug, slug)))
    .orderBy(asc(skus.priceSatang));

  return (await loadStoreProducts(rows))[0] ?? null;
}

export async function listPublishedCollections() {
  return db
    .select({
      accentKey: collections.accentKey,
      description: collections.description,
      id: collections.id,
      name: collections.name,
      seoDescription: collections.seoDescription,
      seoTitle: collections.seoTitle,
      slug: collections.slug,
      tagline: collections.tagline,
    })
    .from(collections)
    .where(eq(collections.status, "published"))
    .orderBy(asc(collections.sortOrder), asc(collections.name));
}

export async function findPublishedCollectionBySlug(slug: string) {
  const [collection] = await db
    .select({
      description: collections.description,
      id: collections.id,
      name: collections.name,
      seoDescription: collections.seoDescription,
      seoTitle: collections.seoTitle,
      slug: collections.slug,
      tagline: collections.tagline,
    })
    .from(collections)
    .where(
      and(
        eq(collections.slug, slug),
        eq(collections.status, "published"),
      ),
    )
    .limit(1);

  return collection ?? null;
}
