import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  productImages,
  products,
} from "@/db/schema";

export async function listAdminProductMedia() {
  const [productOptions, images] = await Promise.all([
    db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(inArray(products.status, ["draft", "published"]))
      .orderBy(asc(products.name)),
    db
      .select({
        altText: productImages.altText,
        height: productImages.height,
        id: productImages.id,
        imageRole: productImages.imageRole,
        productId: productImages.productId,
        productName: products.name,
        sortOrder: productImages.sortOrder,
        storageUrl: productImages.storageUrl,
        width: productImages.width,
      })
      .from(productImages)
      .innerJoin(products, eq(products.id, productImages.productId))
      .orderBy(asc(products.name), asc(productImages.sortOrder)),
  ]);

  return { images, productOptions };
}

export async function createAdminProductMedia(input: {
  adminUserId: string;
  altText: string;
  height: number;
  imageRole: "after" | "before" | "cover" | "gallery" | "og" | "thumbnail";
  productId: string;
  sortOrder: number;
  storageUrl: string;
  width: number;
}): Promise<
  | "created"
  | "dimension_mismatch"
  | "duplicate"
  | "product_not_found"
> {
  return db.transaction(async (transaction) => {
    const [product] = await transaction
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);
    if (!product) return "product_not_found";

    const [existing] = await transaction
      .select({ id: productImages.id })
      .from(productImages)
      .where(
        and(
          eq(productImages.productId, input.productId),
          eq(productImages.imageRole, input.imageRole),
          eq(productImages.storageUrl, input.storageUrl),
        ),
      )
      .limit(1);
    if (existing) return "duplicate";

    if (input.imageRole === "before" || input.imageRole === "after") {
      const counterpartRole =
        input.imageRole === "before" ? "after" : "before";
      const [counterpart] = await transaction
        .select({
          height: productImages.height,
          width: productImages.width,
        })
        .from(productImages)
        .where(
          and(
            eq(productImages.productId, input.productId),
            eq(productImages.imageRole, counterpartRole),
          ),
        )
        .limit(1);
      if (
        counterpart &&
        (counterpart.width !== input.width ||
          counterpart.height !== input.height)
      ) {
        return "dimension_mismatch";
      }
    }

    const [created] = await transaction
      .insert(productImages)
      .values({
        altText: input.altText,
        height: input.height,
        imageRole: input.imageRole,
        productId: input.productId,
        sortOrder: input.sortOrder,
        storageUrl: input.storageUrl,
        width: input.width,
      })
      .returning({ id: productImages.id });
    if (!created) throw new Error("Product media insert returned no ID.");

    await transaction.insert(adminAuditLogs).values({
      action: "catalog.media.create",
      adminUserId: input.adminUserId,
      afterData: {
        altText: input.altText,
        height: input.height,
        imageRole: input.imageRole,
        productId: input.productId,
        sortOrder: input.sortOrder,
        storageUrl: input.storageUrl,
        width: input.width,
      },
      entityId: created.id,
      entityType: "product_image",
    });
    return "created";
  });
}

export async function removeAdminProductMedia(input: {
  adminUserId: string;
  imageId: string;
}): Promise<"not_found" | "removed"> {
  return db.transaction(async (transaction) => {
    const [removed] = await transaction
      .delete(productImages)
      .where(eq(productImages.id, input.imageId))
      .returning({
        altText: productImages.altText,
        imageRole: productImages.imageRole,
        productId: productImages.productId,
        storageUrl: productImages.storageUrl,
      });
    if (!removed) return "not_found";

    await transaction.insert(adminAuditLogs).values({
      action: "catalog.media.remove",
      adminUserId: input.adminUserId,
      beforeData: removed,
      entityId: input.imageId,
      entityType: "product_image",
    });
    return "removed";
  });
}
