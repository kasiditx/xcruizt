import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  downloadEvents,
  files,
  productVersions,
  products,
} from "@/db/schema";

const CUSTOMER_DOWNLOAD_HISTORY_LIMIT = 100;

export function listCustomerDownloadHistory(userId: string) {
  return db
    .select({
      createdAt: downloadEvents.createdAt,
      fileRole: files.fileRole,
      filename: files.originalFilename,
      id: downloadEvents.id,
      productName: products.name,
      result: downloadEvents.result,
      version: productVersions.version,
    })
    .from(downloadEvents)
    .innerJoin(files, eq(files.id, downloadEvents.fileId))
    .innerJoin(
      productVersions,
      eq(productVersions.id, files.productVersionId),
    )
    .innerJoin(products, eq(products.id, productVersions.productId))
    .where(eq(downloadEvents.userId, userId))
    .orderBy(desc(downloadEvents.createdAt))
    .limit(CUSTOMER_DOWNLOAD_HISTORY_LIMIT);
}
