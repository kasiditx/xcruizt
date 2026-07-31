import { z } from "zod";

const checkoutRequestSchema = z.object({
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .max(64)
    .regex(/^[A-Z0-9_-]*$/)
    .optional()
    .transform((value) => value || null),
  items: z
    .array(
      z.object({
        quantity: z.number().int().min(1).max(10),
        skuId: z.uuid(),
      }),
    )
    .min(1)
    .max(20),
});

export type CheckoutRequest = {
  couponCode: string | null;
  items: Array<{ quantity: number; skuId: string }>;
};

export function parseCheckoutRequest(
  input: unknown,
):
  | { ok: true; value: CheckoutRequest }
  | { ok: false; reason: "invalid_input" } {
  const parsed = checkoutRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid_input" };

  const quantities = new Map<string, number>();
  for (const item of parsed.data.items) {
    quantities.set(
      item.skuId,
      (quantities.get(item.skuId) ?? 0) + item.quantity,
    );
  }

  const items = [...quantities].map(([skuId, quantity]) => ({
    quantity,
    skuId,
  }));
  if (items.some(({ quantity }) => quantity > 10)) {
    return { ok: false, reason: "invalid_input" };
  }

  return {
    ok: true,
    value: { couponCode: parsed.data.couponCode, items },
  };
}

export type PricingSku = {
  currency: string;
  id: string;
  name: string;
  priceSatang: number;
  productIds: string[];
  purchaseLimit: number | null;
  skuCode: string;
  status: "active" | "inactive" | "draft" | "archived";
};

export type PricingCoupon = {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  endsAt: Date;
  globalRedemptionCount: number;
  id: string;
  maximumDiscountSatang: number | null;
  minimumAmountSatang: number | null;
  perUserLimit: number | null;
  startsAt: Date;
  status: "active" | "draft" | "paused" | "expired";
  usageLimit: number | null;
  userRedemptionCount: number;
};

export type PricingContext = {
  coupon: PricingCoupon | null;
  couponRequested?: boolean;
  now: Date;
  ownedProductIds: ReadonlySet<string>;
  requestedItems: CheckoutRequest["items"];
  skus: PricingSku[];
};

export type PriceQuoteLine = {
  discountSatang: number;
  lineSubtotalSatang: number;
  lineTotalSatang: number;
  productNameSnapshot: string;
  quantity: number;
  skuCodeSnapshot: string;
  skuId: string;
  unitPriceSatang: number;
};

export type PriceQuote = {
  appliedCoupon: { code: string; id: string } | null;
  currency: "THB";
  discountSatang: number;
  lines: PriceQuoteLine[];
  subtotalSatang: number;
  totalSatang: number;
  warnings: Array<
    | "cart_contains_owned_products"
    | "cart_contains_overlapping_products"
  >;
};

function couponIsValid(
  coupon: PricingCoupon,
  subtotalSatang: number,
  now: Date,
): boolean {
  return (
    coupon.status === "active" &&
    coupon.startsAt <= now &&
    coupon.endsAt > now &&
    (coupon.minimumAmountSatang === null ||
      subtotalSatang >= coupon.minimumAmountSatang) &&
    (coupon.usageLimit === null ||
      coupon.globalRedemptionCount < coupon.usageLimit) &&
    (coupon.perUserLimit === null ||
      coupon.userRedemptionCount < coupon.perUserLimit)
  );
}

function calculateDiscount(
  coupon: PricingCoupon | null,
  subtotalSatang: number,
): number {
  if (!coupon) return 0;
  const raw =
    coupon.discountType === "percent"
      ? Math.floor((subtotalSatang * coupon.discountValue) / 100)
      : coupon.discountValue;
  const capped =
    coupon.maximumDiscountSatang === null
      ? raw
      : Math.min(raw, coupon.maximumDiscountSatang);
  return Math.min(subtotalSatang, capped);
}

export function calculatePriceQuote(
  context: PricingContext,
):
  | { ok: true; quote: PriceQuote }
  | {
      ok: false;
      reason:
        | "cart_unavailable"
        | "coupon_invalid"
        | "purchase_limit_exceeded";
    } {
  const skuById = new Map(context.skus.map((sku) => [sku.id, sku]));
  const resolved = context.requestedItems.map((item) => ({
    item,
    sku: skuById.get(item.skuId),
  }));

  if (
    resolved.some(
      ({ sku }) => !sku || sku.status !== "active" || sku.currency !== "THB",
    )
  ) {
    return { ok: false, reason: "cart_unavailable" };
  }

  if (
    resolved.some(
      ({ item, sku }) =>
        sku?.purchaseLimit !== null &&
        item.quantity > (sku?.purchaseLimit ?? 0),
    )
  ) {
    return { ok: false, reason: "purchase_limit_exceeded" };
  }

  const baseLines = resolved.map(({ item, sku }) => {
    const availableSku = sku as PricingSku;
    return {
      lineSubtotalSatang: availableSku.priceSatang * item.quantity,
      productNameSnapshot: availableSku.name,
      quantity: item.quantity,
      sku: availableSku,
      skuCodeSnapshot: availableSku.skuCode,
      skuId: availableSku.id,
      unitPriceSatang: availableSku.priceSatang,
    };
  });
  const subtotalSatang = baseLines.reduce(
    (sum, line) => sum + line.lineSubtotalSatang,
    0,
  );

  if (
    (context.couponRequested && !context.coupon) ||
    (context.coupon &&
      !couponIsValid(context.coupon, subtotalSatang, context.now))
  ) {
    return { ok: false, reason: "coupon_invalid" };
  }

  const discountSatang = calculateDiscount(
    context.coupon,
    subtotalSatang,
  );
  let allocatedDiscount = 0;
  const lines: PriceQuoteLine[] = baseLines.map((line, index) => {
    const isLast = index === baseLines.length - 1;
    const lineDiscount = isLast
      ? discountSatang - allocatedDiscount
      : Math.floor(
          (discountSatang * line.lineSubtotalSatang) / subtotalSatang,
        );
    allocatedDiscount += lineDiscount;
    return {
      discountSatang: lineDiscount,
      lineSubtotalSatang: line.lineSubtotalSatang,
      lineTotalSatang: line.lineSubtotalSatang - lineDiscount,
      productNameSnapshot: line.productNameSnapshot,
      quantity: line.quantity,
      skuCodeSnapshot: line.skuCodeSnapshot,
      skuId: line.skuId,
      unitPriceSatang: line.unitPriceSatang,
    };
  });

  const productOccurrences = new Map<string, number>();
  const hasOwnedProduct = baseLines.some(({ sku }) =>
    sku.productIds.some((id) => context.ownedProductIds.has(id)),
  );
  for (const { sku } of baseLines) {
    for (const productId of sku.productIds) {
      productOccurrences.set(
        productId,
        (productOccurrences.get(productId) ?? 0) + 1,
      );
    }
  }

  const warnings: PriceQuote["warnings"] = [];
  if (hasOwnedProduct) warnings.push("cart_contains_owned_products");
  if ([...productOccurrences.values()].some((count) => count > 1)) {
    warnings.push("cart_contains_overlapping_products");
  }

  return {
    ok: true,
    quote: {
      appliedCoupon: context.coupon
        ? { code: context.coupon.code, id: context.coupon.id }
        : null,
      currency: "THB",
      discountSatang,
      lines,
      subtotalSatang,
      totalSatang: subtotalSatang - discountSatang,
      warnings,
    },
  };
}
