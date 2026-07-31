import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  files,
  outboxEvents,
  products,
  productVersions,
} from "@/db/schema";

import type { ProductVersionInput } from "../application/product-version-input";

export type AdminProductVersion = {
  changelogMd: string;
  createdAt: Date;
  id: string;
  isCurrent: boolean;
  productId: string;
  productName: string;
  releaseNotesMd: string | null;
  releasedAt: Date | null;
  status: "draft" | "published" | "deprecated";
  version: string;
};

export type VersionMutationResult =
  | "created"
  | "updated"
  | "published"
  | "not_found"
  | "immutable"
  | "product_not_published"
  | "active_main_package_required";

const versionSelection = {
  changelogMd: productVersions.changelogMd,
  createdAt: productVersions.createdAt,
  id: productVersions.id,
  isCurrent: productVersions.isCurrent,
  productId: productVersions.productId,
  productName: products.name,
  releaseNotesMd: productVersions.releaseNotesMd,
  releasedAt: productVersions.releasedAt,
  status: productVersions.status,
  version: productVersions.version,
} as const;

export async function listAdminProductVersions(): Promise<
  AdminProductVersion[]
> {
  return db
    .select(versionSelection)
    .from(productVersions)
    .innerJoin(products, eq(products.id, productVersions.productId))
    .orderBy(desc(productVersions.createdAt));
}

export async function findAdminProductVersionById(
  versionId: string,
): Promise<AdminProductVersion | null> {
  const [version] = await db
    .select(versionSelection)
    .from(productVersions)
    .innerJoin(products, eq(products.id, productVersions.productId))
    .where(eq(productVersions.id, versionId))
    .limit(1);

  return version ?? null;
}

export async function createAdminProductVersion(
  productId: string,
  input: ProductVersionInput,
  adminUserId: string,
): Promise<VersionMutationResult> {
  return db.transaction(async (transaction) => {
    const [product] = await transaction
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return "not_found";
    }

    const [created] = await transaction
      .insert(productVersions)
      .values({
        ...input,
        createdBy: adminUserId,
        productId,
        status: "draft",
      })
      .returning({ id: productVersions.id });

    if (!created) {
      throw new Error("Product version insert returned no identifier.");
    }

    await transaction.insert(adminAuditLogs).values({
      action: "catalog.version.create",
      adminUserId,
      afterData: { ...input, id: created.id, productId, status: "draft" },
      entityId: created.id,
      entityType: "product_version",
    });

    return "created";
  });
}

export async function updateAdminProductVersion(
  versionId: string,
  input: ProductVersionInput,
  adminUserId: string,
): Promise<VersionMutationResult> {
  return db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select()
      .from(productVersions)
      .where(eq(productVersions.id, versionId))
      .limit(1);

    if (!existing) {
      return "not_found";
    }
    if (existing.status !== "draft") {
      return "immutable";
    }

    await transaction
      .update(productVersions)
      .set(input)
      .where(eq(productVersions.id, versionId));
    await transaction.insert(adminAuditLogs).values({
      action: "catalog.version.update",
      adminUserId,
      afterData: { ...existing, ...input },
      beforeData: existing,
      entityId: versionId,
      entityType: "product_version",
    });

    return "updated";
  });
}

export async function publishAdminProductVersion(
  versionId: string,
  adminUserId: string,
): Promise<VersionMutationResult> {
  return db.transaction(async (transaction) => {
    const [target] = await transaction
      .select({
        productId: productVersions.productId,
        productStatus: products.status,
        status: productVersions.status,
        version: productVersions.version,
      })
      .from(productVersions)
      .innerJoin(products, eq(products.id, productVersions.productId))
      .where(eq(productVersions.id, versionId))
      .limit(1);

    if (!target) {
      return "not_found";
    }
    if (target.status !== "draft") {
      return "immutable";
    }
    if (target.productStatus !== "published") {
      return "product_not_published";
    }

    const [mainPackage] = await transaction
      .select({ id: files.id })
      .from(files)
      .where(
        and(
          eq(files.productVersionId, versionId),
          eq(files.fileRole, "main_package"),
          eq(files.status, "active"),
        ),
      )
      .limit(1);

    if (!mainPackage) {
      return "active_main_package_required";
    }

    await transaction
      .update(productVersions)
      .set({ isCurrent: false })
      .where(
        and(
          eq(productVersions.productId, target.productId),
          eq(productVersions.isCurrent, true),
        ),
      );

    const releasedAt = new Date();
    await transaction
      .update(productVersions)
      .set({
        isCurrent: true,
        releasedAt,
        status: "published",
      })
      .where(eq(productVersions.id, versionId));
    await transaction.insert(adminAuditLogs).values({
      action: "catalog.version.publish",
      adminUserId,
      afterData: {
        id: versionId,
        isCurrent: true,
        productId: target.productId,
        releasedAt,
        status: "published",
        version: target.version,
      },
      beforeData: target,
      entityId: versionId,
      entityType: "product_version",
    });
    await transaction.insert(outboxEvents).values({
      aggregateId: versionId,
      aggregateType: "product_version",
      payload: {
        productId: target.productId,
        productVersionId: versionId,
        version: target.version,
      },
      topic: "product.version.published",
    });

    return "published";
  });
}
