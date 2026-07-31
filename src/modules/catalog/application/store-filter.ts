import { z } from "zod";

import type { StoreProduct } from "../infrastructure/storefront-repository";

const filterSchema = z.object({
  collection: z.string().trim().max(100).optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
  sort: z
    .enum(["name", "price_asc", "price_desc"])
    .optional()
    .catch(undefined),
  type: z
    .enum(["single", "collection", "bundle"])
    .optional()
    .catch(undefined),
});

export type StoreFilters = z.infer<typeof filterSchema>;

export function parseStoreFilters(input: Record<string, unknown>): StoreFilters {
  return filterSchema.parse(input);
}

function lowestPrice(product: StoreProduct): number {
  return product.skus[0]?.priceSatang ?? Number.MAX_SAFE_INTEGER;
}

export function filterStoreProducts(
  products: readonly StoreProduct[],
  filters: StoreFilters,
): StoreProduct[] {
  const query = filters.q?.toLocaleLowerCase("th-TH");
  const filtered = products.filter((product) => {
    if (
      filters.collection &&
      product.collectionSlug !== filters.collection
    ) {
      return false;
    }
    if (
      filters.type &&
      !product.skus.some(({ skuType }) => skuType === filters.type)
    ) {
      return false;
    }
    if (query) {
      const searchable = [
        product.name,
        product.collectionName,
        product.mood,
        product.shortDescription,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLocaleLowerCase("th-TH");
      if (!searchable.includes(query)) return false;
    }
    return true;
  });

  return filtered.toSorted((left, right) => {
    if (filters.sort === "price_asc") {
      return lowestPrice(left) - lowestPrice(right);
    }
    if (filters.sort === "price_desc") {
      return lowestPrice(right) - lowestPrice(left);
    }
    return left.name.localeCompare(right.name, "th");
  });
}
