import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  collections,
  entitlements,
  files,
  products,
  productVersions,
  skuEntitlements,
  skus,
} from "@/db/schema";

import {
  buildLibraryItems,
  type LibraryItem,
} from "../application/library";

export async function getLibraryItemsForUser(
  userId: string,
): Promise<LibraryItem[]> {
  const rows = await db
    .select({
      changelogMd: productVersions.changelogMd,
      collectionName: collections.name,
      entitlementId: entitlements.id,
      grantedAt: entitlements.grantedAt,
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      releaseNotesMd: productVersions.releaseNotesMd,
      shortDescription: products.shortDescription,
      status: entitlements.status,
      version: productVersions.version,
    })
    .from(entitlements)
    .innerJoin(products, eq(products.id, entitlements.productId))
    .leftJoin(collections, eq(collections.id, products.collectionId))
    .leftJoin(
      productVersions,
      and(
        eq(productVersions.productId, products.id),
        eq(productVersions.isCurrent, true),
        eq(productVersions.status, "published"),
      ),
    )
    .where(
      and(
        eq(entitlements.userId, userId),
        eq(entitlements.status, "active"),
      ),
    )
    .orderBy(desc(entitlements.grantedAt));

  return buildLibraryItems(rows);
}

export type LibraryDownloadFile = {
  fileId: string;
  fileRole: "checksum" | "extra" | "guide" | "installer" | "main_package";
  originalFilename: string;
  productId: string;
};

export type LibrarySkuPackageFile = {
  fileId: string;
  fileRole: "main_package";
  originalFilename: string;
  skuEntitlementId: string;
  skuId: string;
  skuName: string;
  skuType: "single" | "collection" | "bundle";
};

export async function getLibraryDownloadFilesForUser(
  userId: string,
): Promise<LibraryDownloadFile[]> {
  return db
    .select({
      fileId: files.id,
      fileRole: files.fileRole,
      originalFilename: files.originalFilename,
      productId: entitlements.productId,
    })
    .from(entitlements)
    .innerJoin(
      productVersions,
      and(
        eq(productVersions.productId, entitlements.productId),
        eq(productVersions.isCurrent, true),
        eq(productVersions.status, "published"),
      ),
    )
    .innerJoin(
      files,
      and(
        eq(files.productVersionId, productVersions.id),
        eq(files.status, "active"),
      ),
    )
    .where(
      and(
        eq(entitlements.userId, userId),
        eq(entitlements.status, "active"),
      ),
    )
    .orderBy(files.fileRole, files.originalFilename);
}

export async function getLibrarySkuPackageFilesForUser(
  userId: string,
): Promise<LibrarySkuPackageFile[]> {
  const filesForUser = await db
    .select({
      fileId: files.id,
      fileRole: files.fileRole,
      originalFilename: files.originalFilename,
      skuEntitlementId: skuEntitlements.id,
      skuId: skus.id,
      skuName: skus.name,
      skuType: skus.skuType,
    })
    .from(skuEntitlements)
    .innerJoin(skus, eq(skus.id, skuEntitlements.skuId))
    .innerJoin(
      files,
      and(
        eq(files.skuId, skuEntitlements.skuId),
        eq(files.fileRole, "main_package"),
        eq(files.status, "active"),
      ),
    )
    .where(
      and(
        eq(skuEntitlements.userId, userId),
        eq(skuEntitlements.status, "active"),
      ),
    )
    .orderBy(skus.name, files.originalFilename);

  return filesForUser.map((file) => ({
    ...file,
    fileRole: "main_package" as const,
  }));
}
