import "server-only";

import { and, count, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  couponRedemptions,
  coupons,
  entitlements,
  skuProducts,
  skus,
} from "@/db/schema";

import {
  calculatePriceQuote,
  type CheckoutRequest,
  type PricingCoupon,
  type PricingSku,
} from "../application/pricing";

async function loadCoupon(
  couponCode: string | null,
  userId: string,
): Promise<PricingCoupon | null> {
  if (!couponCode) return null;

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(sql`lower(${coupons.code}) = lower(${couponCode})`)
    .limit(1);
  if (!coupon) return null;

  const [[globalCount], [userCount]] = await Promise.all([
    db
      .select({ value: count() })
      .from(couponRedemptions)
      .where(eq(couponRedemptions.couponId, coupon.id)),
    db
      .select({ value: count() })
      .from(couponRedemptions)
      .where(
        and(
          eq(couponRedemptions.couponId, coupon.id),
          eq(couponRedemptions.userId, userId),
        ),
      ),
  ]);

  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    endsAt: coupon.endsAt,
    globalRedemptionCount: globalCount?.value ?? 0,
    id: coupon.id,
    maximumDiscountSatang: coupon.maximumDiscountSatang,
    minimumAmountSatang: coupon.minimumAmountSatang,
    perUserLimit: coupon.perUserLimit,
    startsAt: coupon.startsAt,
    status: coupon.status,
    usageLimit: coupon.usageLimit,
    userRedemptionCount: userCount?.value ?? 0,
  };
}

async function loadPricingSkus(skuIds: string[]): Promise<PricingSku[]> {
  const rows = await db
    .select({
      currency: skus.currency,
      id: skus.id,
      name: skus.name,
      priceSatang: skus.priceSatang,
      productId: skuProducts.productId,
      purchaseLimit: skus.purchaseLimit,
      skuCode: skus.skuCode,
      status: skus.status,
    })
    .from(skus)
    .innerJoin(skuProducts, eq(skuProducts.skuId, skus.id))
    .where(inArray(skus.id, skuIds));

  const grouped = new Map<string, PricingSku>();
  for (const row of rows) {
    const existing = grouped.get(row.id);
    if (existing) {
      existing.productIds.push(row.productId);
      continue;
    }
    grouped.set(row.id, {
      currency: row.currency,
      id: row.id,
      name: row.name,
      priceSatang: row.priceSatang,
      productIds: [row.productId],
      purchaseLimit: row.purchaseLimit,
      skuCode: row.skuCode,
      status: row.status,
    });
  }

  return [...grouped.values()];
}

export async function getPriceQuoteForUser(
  userId: string,
  request: CheckoutRequest,
) {
  const skuIds = request.items.map(({ skuId }) => skuId);
  const [pricingSkus, ownedRows, coupon] = await Promise.all([
    loadPricingSkus(skuIds),
    db
      .select({ productId: entitlements.productId })
      .from(entitlements)
      .where(
        and(
          eq(entitlements.userId, userId),
          eq(entitlements.status, "active"),
        ),
      ),
    loadCoupon(request.couponCode, userId),
  ]);

  return calculatePriceQuote({
    coupon,
    couponRequested: Boolean(request.couponCode),
    now: new Date(),
    ownedProductIds: new Set(ownedRows.map(({ productId }) => productId)),
    requestedItems: request.items,
    skus: pricingSkus,
  });
}
