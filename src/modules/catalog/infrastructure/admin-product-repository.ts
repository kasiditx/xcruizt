import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  collections,
  products,
} from "@/db/schema";

import type { ProductInput } from "../application/product-input";

export type ProductCollectionOption = {
  id: string;
  name: string;
  status: "draft" | "published" | "archived";
};

export type AdminProduct = {
  brandName: string;
  canonicalPath: string | null;
  collectionId: string | null;
  collectionName: string | null;
  compatibility: unknown;
  description: string;
  id: string;
  isIndexable: boolean;
  mood: string | null;
  name: string;
  publishedAt: Date | null;
  schemaCategory: string;
  seoDescription: string | null;
  seoTitle: string | null;
  shortDescription: string;
  slug: string;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
};

const productSelection = {
  brandName: products.brandName,
  canonicalPath: products.canonicalPath,
  collectionId: products.collectionId,
  collectionName: collections.name,
  compatibility: products.compatibility,
  description: products.description,
  id: products.id,
  isIndexable: products.isIndexable,
  mood: products.mood,
  name: products.name,
  publishedAt: products.publishedAt,
  schemaCategory: products.schemaCategory,
  seoDescription: products.seoDescription,
  seoTitle: products.seoTitle,
  shortDescription: products.shortDescription,
  slug: products.slug,
  status: products.status,
  updatedAt: products.updatedAt,
} as const;

export async function listProductCollectionOptions(): Promise<
  ProductCollectionOption[]
> {
  return db
    .select({
      id: collections.id,
      name: collections.name,
      status: collections.status,
    })
    .from(collections)
    .orderBy(asc(collections.sortOrder), asc(collections.name));
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  return db
    .select(productSelection)
    .from(products)
    .leftJoin(collections, eq(collections.id, products.collectionId))
    .orderBy(asc(products.name));
}

export async function findAdminProductById(
  productId: string,
): Promise<AdminProduct | null> {
  const [product] = await db
    .select(productSelection)
    .from(products)
    .leftJoin(collections, eq(collections.id, products.collectionId))
    .where(eq(products.id, productId))
    .limit(1);

  return product ?? null;
}

export async function createAdminProduct(
  input: ProductInput,
  adminUserId: string,
): Promise<string> {
  return db.transaction(async (transaction) => {
    const now = new Date();
    const [created] = await transaction
      .insert(products)
      .values({
        ...input,
        publishedAt: input.status === "published" ? now : null,
        updatedAt: now,
      })
      .returning({ id: products.id });

    if (!created) {
      throw new Error("Product insert returned no identifier.");
    }

    await transaction.insert(adminAuditLogs).values({
      action: "catalog.product.create",
      adminUserId,
      afterData: {
        ...input,
        id: created.id,
      },
      entityId: created.id,
      entityType: "product",
    });

    return created.id;
  });
}

export async function updateAdminProduct(
  productId: string,
  input: ProductInput,
  adminUserId: string,
): Promise<"updated" | "not_found"> {
  return db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!existing) {
      return "not_found";
    }

    const now = new Date();
    const publishedAt =
      input.status === "published"
        ? (existing.publishedAt ?? now)
        : existing.publishedAt;

    await transaction
      .update(products)
      .set({
        ...input,
        publishedAt,
        updatedAt: now,
      })
      .where(eq(products.id, productId));

    await transaction.insert(adminAuditLogs).values({
      action: "catalog.product.update",
      adminUserId,
      afterData: {
        ...input,
        id: productId,
        publishedAt,
      },
      beforeData: existing,
      entityId: productId,
      entityType: "product",
    });

    return "updated";
  });
}
