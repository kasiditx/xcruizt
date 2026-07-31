import "server-only";

import {
  and,
  count,
  eq,
  gte,
} from "drizzle-orm";

import { db } from "@/db/client";
import {
  downloadEvents,
  entitlements,
  files,
  productVersions,
  profiles,
} from "@/db/schema";

export type AuthorizedDownload = {
  contentType: string;
  entitlementId: string;
  fileId: string;
  orderId: string | null;
  originalFilename: string;
  storageBucket: string;
  storageKey: string;
};

export async function authorizeProductDownload(
  userId: string,
  productId: string,
  fileId: string,
): Promise<AuthorizedDownload | null> {
  const [download] = await db
    .select({
      contentType: files.contentType,
      entitlementId: entitlements.id,
      fileId: files.id,
      orderId: entitlements.sourceOrderId,
      originalFilename: files.originalFilename,
      storageBucket: files.storageBucket,
      storageKey: files.storageKey,
    })
    .from(entitlements)
    .innerJoin(profiles, eq(profiles.id, entitlements.userId))
    .innerJoin(
      productVersions,
      and(
        eq(productVersions.productId, entitlements.productId),
        eq(productVersions.status, "published"),
        eq(productVersions.isCurrent, true),
      ),
    )
    .innerJoin(
      files,
      and(
        eq(files.productVersionId, productVersions.id),
        eq(files.id, fileId),
        eq(files.status, "active"),
      ),
    )
    .where(
      and(
        eq(entitlements.userId, userId),
        eq(entitlements.productId, productId),
        eq(entitlements.status, "active"),
        eq(profiles.customerStatus, "active"),
      ),
    )
    .limit(1);

  return download ?? null;
}

export async function getRecentDownloadAttemptCounts(input: {
  ipHash: string | null;
  userId: string;
  windowStartedAt: Date;
}): Promise<{ ipAttempts: number; userAttempts: number }> {
  const userCountQuery = db
    .select({ value: count() })
    .from(downloadEvents)
    .where(
      and(
        eq(downloadEvents.userId, input.userId),
        gte(downloadEvents.createdAt, input.windowStartedAt),
      ),
    );

  const [userRows, ipRows] = await Promise.all([
    userCountQuery,
    input.ipHash
      ? db
          .select({ value: count() })
          .from(downloadEvents)
          .where(
            and(
              eq(downloadEvents.ipHash, input.ipHash),
              gte(
                downloadEvents.createdAt,
                input.windowStartedAt,
              ),
            ),
          )
      : Promise.resolve([{ value: 0 }]),
  ]);

  return {
    ipAttempts: Number(ipRows[0]?.value ?? 0),
    userAttempts: Number(userRows[0]?.value ?? 0),
  };
}

export async function recordDownloadEvent(input: {
  download: AuthorizedDownload;
  ipHash: string | null;
  result: "allowed" | "file_missing" | "rate_limited";
  userId: string;
  userAgentHash: string | null;
}): Promise<void> {
  await db.insert(downloadEvents).values({
    entitlementId: input.download.entitlementId,
    fileId: input.download.fileId,
    ipHash: input.ipHash,
    orderId: input.download.orderId,
    result: input.result,
    userAgentHash: input.userAgentHash,
    userId: input.userId,
  });
}
