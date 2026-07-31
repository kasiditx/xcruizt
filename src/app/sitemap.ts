import type { MetadataRoute } from "next";

import { env } from "@/lib/env/server";
import {
  listPublishedCollections,
  listStoreProducts,
} from "@/modules/catalog/infrastructure/storefront-repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [collections, products] = await Promise.all([
    listPublishedCollections(),
    listStoreProducts(),
  ]);
  const absolute = (path: string) =>
    new URL(path, env.NEXT_PUBLIC_SITE_URL).toString();

  return [
    { changeFrequency: "weekly", priority: 1, url: absolute("/") },
    { changeFrequency: "daily", priority: 0.9, url: absolute("/shop") },
    {
      changeFrequency: "weekly",
      priority: 0.85,
      url: absolute("/collections"),
    },
    ...collections.map((collection) => ({
      changeFrequency: "weekly" as const,
      priority: 0.8,
      url: absolute(`/collections/${collection.slug}`),
    })),
    ...products
      .filter(({ isIndexable }) => isIndexable)
      .map((product) => ({
        changeFrequency: "weekly" as const,
        priority: 0.8,
        url: absolute(`/products/${product.slug}`),
      })),
  ];
}
