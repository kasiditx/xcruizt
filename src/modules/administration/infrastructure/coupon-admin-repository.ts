import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  couponRedemptions,
  coupons,
} from "@/db/schema";
import type { CouponInput } from "../application/coupon-input";

export async function listAdminCoupons() {
  return db
    .select({
      code: coupons.code,
      discountType: coupons.discountType,
      discountValue: coupons.discountValue,
      endsAt: coupons.endsAt,
      id: coupons.id,
      perUserLimit: coupons.perUserLimit,
      redemptionCount: sql<number>`(
        select count(*)::int
        from ${couponRedemptions}
        where ${couponRedemptions.couponId} = ${coupons.id}
      )`,
      startsAt: coupons.startsAt,
      status: coupons.status,
      usageLimit: coupons.usageLimit,
    })
    .from(coupons)
    .orderBy(desc(coupons.createdAt));
}

export async function createAdminCoupon(input: {
  adminUserId: string;
  coupon: CouponInput;
}): Promise<"created" | "duplicate"> {
  return db.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(coupons)
      .values({ ...input.coupon, status: "draft" })
      .onConflictDoNothing()
      .returning({ id: coupons.id });
    if (!created) return "duplicate";

    await transaction.insert(adminAuditLogs).values({
      action: "coupon.create",
      adminUserId: input.adminUserId,
      afterData: {
        ...input.coupon,
        endsAt: input.coupon.endsAt.toISOString(),
        startsAt: input.coupon.startsAt.toISOString(),
        status: "draft",
      },
      entityId: created.id,
      entityType: "coupon",
    });
    return "created";
  });
}

export async function updateAdminCouponStatus(input: {
  adminUserId: string;
  couponId: string;
  status: "active" | "expired" | "paused";
}): Promise<"invalid_transition" | "not_found" | "updated"> {
  return db.transaction(async (transaction) => {
    const [coupon] = await transaction
      .select({
        endsAt: coupons.endsAt,
        status: coupons.status,
      })
      .from(coupons)
      .where(eq(coupons.id, input.couponId))
      .limit(1);
    if (!coupon) return "not_found";
    if (input.status === "active" && coupon.endsAt <= new Date()) {
      return "invalid_transition";
    }

    const now = new Date();
    await transaction
      .update(coupons)
      .set({ status: input.status, updatedAt: now })
      .where(eq(coupons.id, input.couponId));
    await transaction.insert(adminAuditLogs).values({
      action: "coupon.status.update",
      adminUserId: input.adminUserId,
      afterData: { status: input.status },
      beforeData: { status: coupon.status },
      entityId: input.couponId,
      entityType: "coupon",
    });
    return "updated";
  });
}
