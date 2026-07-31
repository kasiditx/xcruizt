import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  entitlements,
  outboxEvents,
  products,
  profiles,
} from "@/db/schema";

export async function grantManualEntitlement(input: {
  adminUserId: string;
  productId: string;
  reason: string;
  userId: string;
}): Promise<"already_active" | "granted" | "not_found"> {
  return db.transaction(async (transaction) => {
    const [target] = await transaction
      .select({
        productId: products.id,
        userId: profiles.id,
      })
      .from(profiles)
      .innerJoin(products, eq(products.id, input.productId))
      .where(
        and(
          eq(profiles.id, input.userId),
          eq(products.status, "published"),
        ),
      )
      .limit(1);
    if (!target) return "not_found";

    const [created] = await transaction
      .insert(entitlements)
      .values({
        productId: input.productId,
        sourceType: "manual",
        userId: input.userId,
      })
      .onConflictDoNothing()
      .returning({ id: entitlements.id });
    if (!created) return "already_active";

    await transaction.insert(adminAuditLogs).values({
      action: "entitlement.manual_grant",
      adminUserId: input.adminUserId,
      afterData: {
        id: created.id,
        productId: input.productId,
        reason: input.reason,
        sourceType: "manual",
        status: "active",
        userId: input.userId,
      },
      entityId: created.id,
      entityType: "entitlement",
    });
    await transaction.insert(outboxEvents).values({
      aggregateId: created.id,
      aggregateType: "entitlement",
      payload: {
        entitlementId: created.id,
        productId: input.productId,
        userId: input.userId,
      },
      topic: "entitlement.granted",
    });

    return "granted";
  });
}

export async function revokeManualEntitlement(input: {
  adminUserId: string;
  entitlementId: string;
  reason: string;
}): Promise<"already_revoked" | "not_found" | "revoked"> {
  return db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select()
      .from(entitlements)
      .where(eq(entitlements.id, input.entitlementId))
      .limit(1);
    if (!existing) return "not_found";
    if (existing.status === "revoked") return "already_revoked";

    const revokedAt = new Date();
    await transaction
      .update(entitlements)
      .set({
        revokedAt,
        revokedReason: input.reason,
        status: "revoked",
      })
      .where(eq(entitlements.id, input.entitlementId));
    await transaction.insert(adminAuditLogs).values({
      action: "entitlement.manual_revoke",
      adminUserId: input.adminUserId,
      afterData: {
        revokedAt,
        revokedReason: input.reason,
        status: "revoked",
      },
      beforeData: existing,
      entityId: input.entitlementId,
      entityType: "entitlement",
    });
    await transaction.insert(outboxEvents).values({
      aggregateId: input.entitlementId,
      aggregateType: "entitlement",
      payload: {
        entitlementId: input.entitlementId,
        productId: existing.productId,
        userId: existing.userId,
      },
      topic: "entitlement.revoked",
    });

    return "revoked";
  });
}
