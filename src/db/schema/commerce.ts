import { sql } from "drizzle-orm";
import {
  char,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { skus } from "./catalog";
import { profiles } from "./identity";

export const orderStatus = pgEnum("order_status", [
  "pending",
  "processing",
  "paid",
  "failed",
  "expired",
  "cancelled",
  "refunded",
  "partially_refunded",
]);

export const paymentProvider = pgEnum("payment_provider", ["stripe"]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
]);

export const refundStatus = pgEnum("refund_status", [
  "pending",
  "succeeded",
  "failed",
  "cancelled",
]);

export const discountType = pgEnum("discount_type", ["percent", "fixed"]);

export const couponStatus = pgEnum("coupon_status", [
  "draft",
  "active",
  "paused",
  "expired",
]);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    discountType: discountType("discount_type").notNull(),
    discountValue: integer("discount_value").notNull(),
    minimumAmountSatang: integer("minimum_amount_satang"),
    maximumDiscountSatang: integer("maximum_discount_satang"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    usageLimit: integer("usage_limit"),
    perUserLimit: integer("per_user_limit"),
    status: couponStatus("status").default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("coupons_code_unique").on(sql`lower(${table.code})`),
    index("coupons_status_starts_at_ends_at_idx").on(
      table.status,
      table.startsAt,
      table.endsAt,
    ),
    check(
      "coupons_discount_value_valid",
      sql`${table.discountValue} > 0 and (${table.discountType} <> 'percent' or ${table.discountValue} <= 100)`,
    ),
    check(
      "coupons_minimum_amount_nonnegative",
      sql`${table.minimumAmountSatang} is null or ${table.minimumAmountSatang} >= 0`,
    ),
    check(
      "coupons_maximum_discount_nonnegative",
      sql`${table.maximumDiscountSatang} is null or ${table.maximumDiscountSatang} >= 0`,
    ),
    check("coupons_date_window_valid", sql`${table.endsAt} > ${table.startsAt}`),
    check(
      "coupons_usage_limit_positive",
      sql`${table.usageLimit} is null or ${table.usageLimit} > 0`,
    ),
    check(
      "coupons_per_user_limit_positive",
      sql`${table.perUserLimit} is null or ${table.perUserLimit} > 0`,
    ),
  ],
).enableRLS();

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    status: orderStatus("status").default("pending").notNull(),
    subtotalSatang: integer("subtotal_satang").notNull(),
    discountSatang: integer("discount_satang").notNull(),
    totalSatang: integer("total_satang").notNull(),
    currency: char("currency", { length: 3 }).default("THB").notNull(),
    couponId: uuid("coupon_id").references(() => coupons.id),
    paymentProvider: paymentProvider("payment_provider")
      .default("stripe")
      .notNull(),
    checkoutRequestId: uuid("checkout_request_id").unique(),
    providerCheckoutSessionId: text(
      "provider_checkout_session_id",
    ).unique(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("orders_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("orders_coupon_id_idx").on(table.couponId),
    index("orders_status_created_at_idx").on(table.status, table.createdAt),
    check(
      "orders_amounts_nonnegative",
      sql`${table.subtotalSatang} >= 0 and ${table.discountSatang} >= 0 and ${table.totalSatang} >= 0`,
    ),
    check(
      "orders_discount_not_above_subtotal",
      sql`${table.discountSatang} <= ${table.subtotalSatang}`,
    ),
    check(
      "orders_total_matches_amounts",
      sql`${table.totalSatang} = ${table.subtotalSatang} - ${table.discountSatang}`,
    ),
    pgPolicy("orders_select_own", {
      for: "select",
      to: "authenticated",
      using: sql`(select auth.uid()) = ${table.userId}`,
    }),
  ],
).enableRLS();

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    skuId: uuid("sku_id")
      .notNull()
      .references(() => skus.id),
    skuCodeSnapshot: text("sku_code_snapshot").notNull(),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    unitPriceSatang: integer("unit_price_satang").notNull(),
    quantity: integer("quantity").notNull(),
    lineSubtotalSatang: integer("line_subtotal_satang").notNull(),
    discountSatang: integer("discount_satang").notNull(),
    lineTotalSatang: integer("line_total_satang").notNull(),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_sku_id_idx").on(table.skuId),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "order_items_amounts_nonnegative",
      sql`${table.unitPriceSatang} >= 0 and ${table.lineSubtotalSatang} >= 0 and ${table.discountSatang} >= 0 and ${table.lineTotalSatang} >= 0`,
    ),
    check(
      "order_items_subtotal_matches_quantity",
      sql`${table.lineSubtotalSatang} = ${table.unitPriceSatang} * ${table.quantity}`,
    ),
    check(
      "order_items_discount_not_above_subtotal",
      sql`${table.discountSatang} <= ${table.lineSubtotalSatang}`,
    ),
    check(
      "order_items_total_matches_amounts",
      sql`${table.lineTotalSatang} = ${table.lineSubtotalSatang} - ${table.discountSatang}`,
    ),
    pgPolicy("order_items_select_own", {
      for: "select",
      to: "authenticated",
      using: sql`exists (
        select 1
        from ${orders}
        where ${orders.id} = ${table.orderId}
          and ${orders.userId} = (select auth.uid())
      )`,
    }),
  ],
).enableRLS();

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    provider: paymentProvider("provider").default("stripe").notNull(),
    providerPaymentIntentId: text("provider_payment_intent_id"),
    providerCheckoutSessionId: text("provider_checkout_session_id"),
    amountSatang: integer("amount_satang").notNull(),
    currency: char("currency", { length: 3 }).default("THB").notNull(),
    status: paymentStatus("status").default("pending").notNull(),
    rawStatus: text("raw_status"),
    paymentMethodType: text("payment_method_type"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("payments_order_id_idx").on(table.orderId),
    index("payments_provider_payment_intent_id_idx").on(
      table.providerPaymentIntentId,
    ),
    index("payments_provider_checkout_session_id_idx").on(
      table.providerCheckoutSessionId,
    ),
    index("payments_status_created_at_idx").on(table.status, table.createdAt),
    check("payments_amount_positive", sql`${table.amountSatang} > 0`),
  ],
).enableRLS();

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id),
    providerRefundId: text("provider_refund_id").notNull().unique(),
    amountSatang: integer("amount_satang").notNull(),
    reason: text("reason"),
    status: refundStatus("status").default("pending").notNull(),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("refunds_payment_id_idx").on(table.paymentId),
    index("refunds_requested_by_idx").on(table.requestedBy),
    index("refunds_status_created_at_idx").on(table.status, table.createdAt),
    check("refunds_amount_positive", sql`${table.amountSatang} > 0`),
  ],
).enableRLS();

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    discountSatang: integer("discount_satang").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("coupon_redemptions_coupon_id_order_id_unique").on(
      table.couponId,
      table.orderId,
    ),
    index("coupon_redemptions_user_id_idx").on(table.userId),
    index("coupon_redemptions_order_id_idx").on(table.orderId),
    check(
      "coupon_redemptions_discount_nonnegative",
      sql`${table.discountSatang} >= 0`,
    ),
  ],
).enableRLS();
