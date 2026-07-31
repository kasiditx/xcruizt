import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  files,
  products,
  productVersions,
} from "@/db/schema";
import type { FileUploadInput } from "../application/file-upload-input";

export type AdminVersionFile = {
  contentType: string;
  fileRole: "checksum" | "extra" | "guide" | "installer" | "main_package";
  fileSizeBytes: number;
  id: string;
  originalFilename: string;
  sha256: string;
  status: "active" | "deleted" | "quarantined" | "staging";
};

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

    if (!file || file.status !== "staging") return "not_found";

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
