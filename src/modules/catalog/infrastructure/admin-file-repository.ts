import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  files,
  products,
  productVersions,
  skus,
} from "@/db/schema";
import type {
  FileUploadInput,
  SkuPackageUploadInput,
} from "../application/file-upload-input";

export type AdminVersionFile = {
  contentType: string;
  fileRole: "checksum" | "extra" | "guide" | "installer" | "main_package";
  fileSizeBytes: number;
  id: string;
  originalFilename: string;
  sha256: string;
  status: "active" | "deleted" | "quarantined" | "staging";
};

export type AdminSkuPackageFile = AdminVersionFile;

export async function listAdminVersionFiles(
  versionId: string,
): Promise<AdminVersionFile[]> {
  return db
    .select({
      contentType: files.contentType,
      fileRole: files.fileRole,
      fileSizeBytes: files.fileSizeBytes,
      id: files.id,
      originalFilename: files.originalFilename,
      sha256: files.sha256,
      status: files.status,
    })
    .from(files)
    .where(eq(files.productVersionId, versionId))
    .orderBy(desc(files.createdAt));
}

export async function getDraftVersionUploadTarget(
  versionId: string,
): Promise<{
  productId: string;
  version: string;
} | null> {
  const [target] = await db
    .select({
      productId: products.id,
      version: productVersions.version,
    })
    .from(productVersions)
    .innerJoin(products, eq(products.id, productVersions.productId))
    .where(
      and(
        eq(productVersions.id, versionId),
        eq(productVersions.status, "draft"),
      ),
    )
    .limit(1);

  return target ?? null;
}

export async function createStagingVersionFile(input: {
  adminUserId: string;
  bucket: string;
  storageKey: string;
  upload: FileUploadInput;
}): Promise<{ fileId: string } | null> {
  return db.transaction(async (transaction) => {
    const [version] = await transaction
      .select({ id: productVersions.id })
      .from(productVersions)
      .where(
        and(
          eq(productVersions.id, input.upload.versionId),
          eq(productVersions.status, "draft"),
        ),
      )
      .limit(1);
    if (!version) return null;

    const [created] = await transaction
      .insert(files)
      .values({
        contentType: input.upload.contentType,
        fileRole: input.upload.fileRole,
        fileSizeBytes: input.upload.fileSizeBytes,
        originalFilename: input.upload.originalFilename,
        productVersionId: input.upload.versionId,
        sha256: input.upload.sha256,
        status: "staging",
        storageBucket: input.bucket,
        storageKey: input.storageKey,
      })
      .returning({ id: files.id });

    if (!created) {
      throw new Error("File insert returned no identifier.");
    }

    await transaction.insert(adminAuditLogs).values({
      action: "catalog.file.upload_requested",
      adminUserId: input.adminUserId,
      afterData: {
        contentType: input.upload.contentType,
        fileRole: input.upload.fileRole,
        fileSizeBytes: input.upload.fileSizeBytes,
        id: created.id,
        originalFilename: input.upload.originalFilename,
        productVersionId: input.upload.versionId,
        sha256: input.upload.sha256,
        status: "staging",
      },
      entityId: created.id,
      entityType: "file",
    });

    return { fileId: created.id };
  });
}

export async function findStagingVersionFile(fileId: string) {
  const [file] = await db
    .select({
      contentType: files.contentType,
      fileRole: files.fileRole,
      fileSizeBytes: files.fileSizeBytes,
      id: files.id,
      originalFilename: files.originalFilename,
      productVersionId: files.productVersionId,
      sha256: files.sha256,
      status: files.status,
      storageBucket: files.storageBucket,
      storageKey: files.storageKey,
      versionStatus: productVersions.status,
    })
    .from(files)
    .innerJoin(
      productVersions,
      eq(productVersions.id, files.productVersionId),
    )
    .where(eq(files.id, fileId))
    .limit(1);

  return file ?? null;
}

export async function finalizeStagingVersionFile(input: {
  adminUserId: string;
  fileId: string;
  verified: boolean;
}): Promise<"activated" | "not_found" | "quarantined"> {
  return db.transaction(async (transaction) => {
    const [file] = await transaction
      .select({
        fileRole: files.fileRole,
        productVersionId: files.productVersionId,
        status: files.status,
      })
      .from(files)
      .innerJoin(
        productVersions,
        and(
          eq(productVersions.id, files.productVersionId),
          eq(productVersions.status, "draft"),
        ),
      )
      .where(eq(files.id, input.fileId))
      .limit(1);

    if (!file || file.status !== "staging" || !file.productVersionId) {
      return "not_found";
    }

    let verified = input.verified;
    if (verified && file.fileRole === "main_package") {
      const [existingMainPackage] = await transaction
        .select({ id: files.id })
        .from(files)
        .where(
          and(
            eq(files.productVersionId, file.productVersionId),
            eq(files.fileRole, "main_package"),
            eq(files.status, "active"),
          ),
        )
        .limit(1);
      if (existingMainPackage) {
        verified = false;
      }
    }

    const nextStatus = verified ? "active" : "quarantined";
    await transaction
      .update(files)
      .set({ status: nextStatus })
      .where(
        and(
          eq(files.id, input.fileId),
          eq(files.status, "staging"),
        ),
      );
    await transaction.insert(adminAuditLogs).values({
      action: verified
        ? "catalog.file.activate"
        : "catalog.file.quarantine",
      adminUserId: input.adminUserId,
      afterData: { status: nextStatus },
      beforeData: { status: "staging" },
      entityId: input.fileId,
      entityType: "file",
    });

    return verified ? "activated" : "quarantined";
  });
}

export async function getSkuPackageUploadTarget(
  skuId: string,
): Promise<{ name: string; skuType: "single" | "collection" | "bundle" } | null> {
  const [target] = await db
    .select({ name: skus.name, skuType: skus.skuType })
    .from(skus)
    .where(
      and(
        eq(skus.id, skuId),
        sql`${skus.status} in ('draft', 'active')`,
      ),
    )
    .limit(1);

  return target ?? null;
}

export async function listAdminSkuPackageFiles(
  skuId: string,
): Promise<AdminSkuPackageFile[]> {
  return db
    .select({
      contentType: files.contentType,
      fileRole: files.fileRole,
      fileSizeBytes: files.fileSizeBytes,
      id: files.id,
      originalFilename: files.originalFilename,
      sha256: files.sha256,
      status: files.status,
    })
    .from(files)
    .where(eq(files.skuId, skuId))
    .orderBy(desc(files.createdAt));
}

export async function createStagingSkuPackageFile(input: {
  adminUserId: string;
  bucket: string;
  storageKey: string;
  upload: SkuPackageUploadInput;
}): Promise<{ fileId: string } | null> {
  return db.transaction(async (transaction) => {
    const [sku] = await transaction
      .select({ id: skus.id })
      .from(skus)
      .where(
        and(
          eq(skus.id, input.upload.skuId),
          sql`${skus.status} in ('draft', 'active')`,
        ),
      )
      .limit(1);
    if (!sku) return null;

    const [created] = await transaction
      .insert(files)
      .values({
        contentType: input.upload.contentType,
        fileRole: input.upload.fileRole,
        fileSizeBytes: input.upload.fileSizeBytes,
        originalFilename: input.upload.originalFilename,
        sha256: input.upload.sha256,
        skuId: input.upload.skuId,
        status: "staging",
        storageBucket: input.bucket,
        storageKey: input.storageKey,
      })
      .returning({ id: files.id });

    if (!created) {
      throw new Error("SKU package file insert returned no identifier.");
    }

    await transaction.insert(adminAuditLogs).values({
      action: "catalog.sku_package.upload_requested",
      adminUserId: input.adminUserId,
      afterData: {
        contentType: input.upload.contentType,
        fileRole: input.upload.fileRole,
        fileSizeBytes: input.upload.fileSizeBytes,
        id: created.id,
        originalFilename: input.upload.originalFilename,
        sha256: input.upload.sha256,
        skuId: input.upload.skuId,
        status: "staging",
      },
      entityId: created.id,
      entityType: "sku_package_file",
    });

    return { fileId: created.id };
  });
}

export async function findStagingSkuPackageFile(fileId: string) {
  const [file] = await db
    .select({
      contentType: files.contentType,
      fileRole: files.fileRole,
      fileSizeBytes: files.fileSizeBytes,
      id: files.id,
      originalFilename: files.originalFilename,
      sha256: files.sha256,
      skuId: files.skuId,
      skuStatus: skus.status,
      status: files.status,
      storageBucket: files.storageBucket,
      storageKey: files.storageKey,
    })
    .from(files)
    .innerJoin(skus, eq(skus.id, files.skuId))
    .where(eq(files.id, fileId))
    .limit(1);

  return file ?? null;
}

export async function finalizeStagingSkuPackageFile(input: {
  adminUserId: string;
  fileId: string;
  verified: boolean;
}): Promise<"activated" | "not_found" | "quarantined"> {
  return db.transaction(async (transaction) => {
    const [file] = await transaction
      .select({
        fileRole: files.fileRole,
        skuId: files.skuId,
        status: files.status,
      })
      .from(files)
      .innerJoin(
        skus,
        and(
          eq(skus.id, files.skuId),
          sql`${skus.status} in ('draft', 'active')`,
        ),
      )
      .where(eq(files.id, input.fileId))
      .limit(1);

    if (!file || file.status !== "staging" || !file.skuId) {
      return "not_found";
    }

    let verified = input.verified;
    if (verified && file.fileRole === "main_package") {
      const [existingMainPackage] = await transaction
        .select({ id: files.id })
        .from(files)
        .where(
          and(
            eq(files.skuId, file.skuId),
            eq(files.fileRole, "main_package"),
            eq(files.status, "active"),
          ),
        )
        .limit(1);
      if (existingMainPackage) verified = false;
    }

    const nextStatus = verified ? "active" : "quarantined";
    await transaction
      .update(files)
      .set({ status: nextStatus })
      .where(and(eq(files.id, input.fileId), eq(files.status, "staging")));
    await transaction.insert(adminAuditLogs).values({
      action: verified
        ? "catalog.sku_package.activate"
        : "catalog.sku_package.quarantine",
      adminUserId: input.adminUserId,
      afterData: { status: nextStatus },
      beforeData: { status: "staging" },
      entityId: input.fileId,
      entityType: "sku_package_file",
    });

    return verified ? "activated" : "quarantined";
  });
}
