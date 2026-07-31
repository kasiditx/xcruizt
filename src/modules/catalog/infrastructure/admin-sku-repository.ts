import "server-only";

import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  products,
  skuProducts,
  skus,
} from "@/db/schema";

import type { SkuInput } from "../application/sku-input";

export type ProductGrantOption = {
  id: string;
  name: string;
  status: "draft" | "published" | "archived";
};

export type AdminSku = {
  compareAtPriceSatang: number | null;
  currency: string;
  id: string;
  name: string;
  priceSatang: number;
  productIds: string[];
  productNames: string[];
  purchaseLimit: number | null;
  skuCode: string;
  skuType: "single" | "collection" | "bundle";
  slug: string;
  status: "draft" | "active" | "inactive" | "archived";
  stripePriceId: string | null;
  updatedAt: Date;
};

export type SkuMutationResult =
  | { status: "created"; id: string }
  | { status: "updated" }
  | {
      status:
        | "not_found"
        | "missing_products"
        | "unpublished_products";
    };

export async function listProductGrantOptions(): Promise<
  ProductGrantOption[]
> {
  return db
    .select({
      id: products.id,
      name: products.name,
      status: products.status,
    })
    .from(products)
    .orderBy(asc(products.name));
}

async function attachProductGrants(
  skuRows: Omit<AdminSku, "productIds" | "productNames">[],
): Promise<AdminSku[]> {
  if (skuRows.length === 0) {
    return [];
  }

  const grants = await db
    .select({
      productId: products.id,
      productName: products.name,
      skuId: skuProducts.skuId,
    })
    .from(skuProducts)
    .innerJoin(products, eq(products.id, skuProducts.productId))
    .where(inArray(skuProducts.skuId, skuRows.map(({ id }) => id)))
    .orderBy(asc(products.name));

  return skuRows.map((sku) => {
    const skuGrants = grants.filter(({ skuId }) => skuId === sku.id);
    return {
      ...sku,
      productIds: skuGrants.map(({ productId }) => productId),
      productNames: skuGrants.map(({ productName }) => productName),
    };
  });
}

export async function listAdminSkus(): Promise<AdminSku[]> {
  const rows = await db
    .select({
      compareAtPriceSatang: skus.compareAtPriceSatang,
      currency: skus.currency,
      id: skus.id,
      name: skus.name,
      priceSatang: skus.priceSatang,
      purchaseLimit: skus.purchaseLimit,
      skuCode: skus.skuCode,
      skuType: skus.skuType,
      slug: skus.slug,
      status: skus.status,
      stripePriceId: skus.stripePriceId,
      updatedAt: skus.updatedAt,
    })
    .from(skus)
    .orderBy(asc(skus.name));

  return attachProductGrants(rows);
}

export async function findAdminSkuById(
  skuId: string,
): Promise<AdminSku | null> {
  const rows = await db
    .select({
      compareAtPriceSatang: skus.compareAtPriceSatang,
      currency: skus.currency,
      id: skus.id,
      name: skus.name,
      priceSatang: skus.priceSatang,
      purchaseLimit: skus.purchaseLimit,
      skuCode: skus.skuCode,
      skuType: skus.skuType,
      slug: skus.slug,
      status: skus.status,
      stripePriceId: skus.stripePriceId,
      updatedAt: skus.updatedAt,
    })
    .from(skus)
    .where(eq(skus.id, skuId))
    .limit(1);

  const [sku] = await attachProductGrants(rows);
  return sku ?? null;
}

async function validateProductGrants(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: SkuInput,
): Promise<"valid" | "missing_products" | "unpublished_products"> {
  const productRows = await transaction
    .select({ id: products.id, status: products.status })
    .from(products)
    .where(inArray(products.id, input.productIds));

  if (productRows.length !== input.productIds.length) {
    return "missing_products";
  }

  if (
    input.status === "active" &&
    productRows.some(({ status }) => status !== "published")
  ) {
    return "unpublished_products";
  }

  return "valid";
}

export async function createAdminSku(
  input: SkuInput,
  adminUserId: string,
): Promise<SkuMutationResult> {
  return db.transaction(async (transaction) => {
    const validation = await validateProductGrants(transaction, input);
    if (validation !== "valid") {
      return { status: validation };
    }

    const [created] = await transaction
      .insert(skus)
      .values(input)
      .returning({ id: skus.id });

    if (!created) {
      throw new Error("SKU insert returned no identifier.");
    }

    await transaction.insert(skuProducts).values(
      input.productIds.map((productId) => ({
        productId,
        skuId: created.id,
      })),
    );
    await transaction.insert(adminAuditLogs).values({
      action: "catalog.sku.create",
      adminUserId,
      afterData: { ...input, id: created.id },
      entityId: created.id,
      entityType: "sku",
    });

    return { id: created.id, status: "created" };
  });
}

export async function updateAdminSku(
  skuId: string,
  input: SkuInput,
  adminUserId: string,
): Promise<SkuMutationResult> {
  return db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select()
      .from(skus)
      .where(eq(skus.id, skuId))
      .limit(1);

    if (!existing) {
      return { status: "not_found" };
    }

    const validation = await validateProductGrants(transaction, input);
    if (validation !== "valid") {
      return { status: validation };
    }

    const existingGrants = await transaction
      .select({ productId: skuProducts.productId })
      .from(skuProducts)
      .where(eq(skuProducts.skuId, skuId));

    await transaction
      .update(skus)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(skus.id, skuId));
    await transaction.delete(skuProducts).where(eq(skuProducts.skuId, skuId));
    await transaction.insert(skuProducts).values(
      input.productIds.map((productId) => ({ productId, skuId })),
    );
    await transaction.insert(adminAuditLogs).values({
      action: "catalog.sku.update",
      adminUserId,
      afterData: { ...input, id: skuId },
      beforeData: {
        ...existing,
        productIds: existingGrants.map(({ productId }) => productId),
      },
      entityId: skuId,
      entityType: "sku",
    });

    return { status: "updated" };
  });
}
