import "server-only";

import { randomBytes } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { orderItems, orders, payments } from "@/db/schema";
import type { PriceQuote } from "../application/pricing";

export type PendingOrder = {
  checkoutRequestId: string;
  expiresAt: Date;
  id: string;
  orderNumber: string;
  providerCheckoutSessionId: string | null;
  status:
    | "pending"
    | "processing"
    | "paid"
    | "failed"
    | "expired"
    | "cancelled"
    | "refunded"
    | "partially_refunded";
  totalSatang: number;
};

function createOrderNumber(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `XRZ-${date}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export async function createPendingOrder(
  userId: string,
  checkoutRequestId: string,
  quote: PriceQuote,
): Promise<{ created: boolean; order: PendingOrder }> {
  return db.transaction(async (transaction) => {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const [created] = await transaction
      .insert(orders)
      .values({
        checkoutRequestId,
        couponId: quote.appliedCoupon?.id ?? null,
        currency: quote.currency,
        discountSatang: quote.discountSatang,
        expiresAt,
        orderNumber: createOrderNumber(),
        subtotalSatang: quote.subtotalSatang,
        totalSatang: quote.totalSatang,
        userId,
      })
      .onConflictDoNothing({ target: orders.checkoutRequestId })
      .returning({
        checkoutRequestId: orders.checkoutRequestId,
        expiresAt: orders.expiresAt,
        id: orders.id,
        orderNumber: orders.orderNumber,
        providerCheckoutSessionId: orders.providerCheckoutSessionId,
        status: orders.status,
        totalSatang: orders.totalSatang,
      });

    if (created?.checkoutRequestId && created.expiresAt) {
      await transaction.insert(orderItems).values(
        quote.lines.map((line) => ({
          discountSatang: line.discountSatang,
          lineSubtotalSatang: line.lineSubtotalSatang,
          lineTotalSatang: line.lineTotalSatang,
          productNameSnapshot: line.productNameSnapshot,
          quantity: line.quantity,
          skuCodeSnapshot: line.skuCodeSnapshot,
          skuId: line.skuId,
          unitPriceSatang: line.unitPriceSatang,
          orderId: created.id,
        })),
      );
      return {
        created: true,
        order: created as PendingOrder,
      };
    }

    const [existing] = await transaction
      .select({
        checkoutRequestId: orders.checkoutRequestId,
        expiresAt: orders.expiresAt,
        id: orders.id,
        orderNumber: orders.orderNumber,
        providerCheckoutSessionId: orders.providerCheckoutSessionId,
        status: orders.status,
        totalSatang: orders.totalSatang,
      })
      .from(orders)
      .where(
        and(
          eq(orders.checkoutRequestId, checkoutRequestId),
          eq(orders.userId, userId),
        ),
      )
      .limit(1);

    if (!existing?.checkoutRequestId || !existing.expiresAt) {
      throw new Error("Idempotent checkout order lookup failed.");
    }

    return { created: false, order: existing as PendingOrder };
  });
}

export async function attachCheckoutSession(
  order: PendingOrder,
  sessionId: string,
): Promise<void> {
  await db.transaction(async (transaction) => {
    const updated = await transaction
      .update(orders)
      .set({
        providerCheckoutSessionId: sessionId,
        status: "processing",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, order.id),
          isNull(orders.providerCheckoutSessionId),
        ),
      )
      .returning({ id: orders.id });

    if (updated.length === 0) return;

    await transaction.insert(payments).values({
      amountSatang: order.totalSatang,
      currency: "THB",
      orderId: order.id,
      providerCheckoutSessionId: sessionId,
      status: "processing",
    });
  });
}

export async function getPersistedOrderQuote(
  orderId: string,
): Promise<PriceQuote> {
  const [orderRows, itemRows] = await Promise.all([
    db
      .select({
        currency: orders.currency,
        discountSatang: orders.discountSatang,
        subtotalSatang: orders.subtotalSatang,
        totalSatang: orders.totalSatang,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1),
    db
      .select({
        discountSatang: orderItems.discountSatang,
        lineSubtotalSatang: orderItems.lineSubtotalSatang,
        lineTotalSatang: orderItems.lineTotalSatang,
        productNameSnapshot: orderItems.productNameSnapshot,
        quantity: orderItems.quantity,
        skuCodeSnapshot: orderItems.skuCodeSnapshot,
        skuId: orderItems.skuId,
        unitPriceSatang: orderItems.unitPriceSatang,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId)),
  ]);
  const [order] = orderRows;

  if (!order || order.currency !== "THB" || itemRows.length === 0) {
    throw new Error("Persisted checkout quote is incomplete.");
  }

  return {
    appliedCoupon: null,
    currency: "THB",
    discountSatang: order.discountSatang,
    lines: itemRows,
    subtotalSatang: order.subtotalSatang,
    totalSatang: order.totalSatang,
    warnings: [],
  };
}

export async function markCheckoutOrderFailed(orderId: string) {
  await db
    .update(orders)
    .set({ status: "failed", updatedAt: new Date() })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.status, "pending"),
      ),
    );
}

export async function findCheckoutResultForUser(
  userId: string,
  providerCheckoutSessionId: string,
) {
  const [order] = await db
    .select({
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalSatang: orders.totalSatang,
    })
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        eq(
          orders.providerCheckoutSessionId,
          providerCheckoutSessionId,
        ),
      ),
    )
    .limit(1);

  return order ?? null;
}
