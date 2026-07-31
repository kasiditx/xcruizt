import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  collections,
  entitlements,
  files,
  products,
  productVersions,
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
