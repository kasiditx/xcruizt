import "server-only";

import {
  and,
  eq,
  sql,
} from "drizzle-orm";

import { db } from "@/db/client";
import {
  couponRedemptions,
  entitlements,
  orderItems,
  orders,
  outboxEvents,
  payments,
  skuEntitlements,
  skuProducts,
  webhookEvents,
} from "@/db/schema";
import {
  validatePaidCheckout,
  type PaidCheckoutMismatchReason,
} from "../application/stripe-webhook";

const MAX_WEBHOOK_ERROR_LENGTH = 500;

export type WebhookClaim =
  | { eventId: string; status: "claimed" }
  | { eventId: string; status: "duplicate" }
  | { eventId: string; status: "payload_mismatch" };

export type PaidCheckoutEvent = {
  amountSatang: number | null;
  currency: string | null;
  orderId: string;
  orderNumber: string | null;
  paymentIntentId: string | null;
  providerCheckoutSessionId: string;
};

export type CheckoutFailureEvent = {
  orderId: string;
  orderNumber: string | null;
  paymentIntentId: string | null;
  providerCheckoutSessionId: string | null;
};

export type FulfillmentRejectionReason =
  | PaidCheckoutMismatchReason
  | "invalid_order_status"
  | "order_has_no_products"
  | "order_not_found";

export async function claimStripeWebhookEvent(input: {
  eventType: string;
  payloadHash: string;
  providerEventId: string;
}): Promise<WebhookClaim> {
  const [created] = await db
    .insert(webhookEvents)
    .values({
      attemptCount: 1,
      eventType: input.eventType,
      payloadHash: input.payloadHash,
      processingStatus: "processing",
      provider: "stripe",
      providerEventId: input.providerEventId,
    })
    .onConflictDoNothing({
      target: [
        webhookEvents.provider,
        webhookEvents.providerEventId,
      ],
    })
    .returning({ id: webhookEvents.id });

  if (created) {
    return { eventId: created.id, status: "claimed" };
  }

  const [existing] = await db
    .select({
      id: webhookEvents.id,
      payloadHash: webhookEvents.payloadHash,
      processingStatus: webhookEvents.processingStatus,
    })
    .from(webhookEvents)
    .where(
      and(
        eq(webhookEvents.provider, "stripe"),
        eq(webhookEvents.providerEventId, input.providerEventId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new Error("Webhook event conflict lookup failed.");
  }

  if (existing.payloadHash !== input.payloadHash) {
    return { eventId: existing.id, status: "payload_mismatch" };
  }

  if (existing.processingStatus !== "failed") {
    return { eventId: existing.id, status: "duplicate" };
  }

  const [reclaimed] = await db
    .update(webhookEvents)
    .set({
      attemptCount: sql`${webhookEvents.attemptCount} + 1`,
      lastError: null,
      processingStatus: "processing",
      processedAt: null,
    })
    .where(
      and(
        eq(webhookEvents.id, existing.id),
        eq(webhookEvents.processingStatus, "failed"),
      ),
    )
    .returning({ id: webhookEvents.id });

  return reclaimed
    ? { eventId: reclaimed.id, status: "claimed" }
    : { eventId: existing.id, status: "duplicate" };
}

export async function markWebhookEventIgnored(
  eventId: string,
  reason: string,
): Promise<void> {
  await db
    .update(webhookEvents)
    .set({
      lastError: reason.slice(0, MAX_WEBHOOK_ERROR_LENGTH),
      processedAt: new Date(),
      processingStatus: "ignored",
    })
    .where(
      and(
        eq(webhookEvents.id, eventId),
        eq(webhookEvents.processingStatus, "processing"),
      ),
    );
}

export async function markWebhookEventFailed(
  eventId: string,
  reason: string,
): Promise<void> {
  await db
    .update(webhookEvents)
    .set({
      lastError: reason.slice(0, MAX_WEBHOOK_ERROR_LENGTH),
      processedAt: null,
      processingStatus: "failed",
    })
    .where(
      and(
        eq(webhookEvents.id, eventId),
        eq(webhookEvents.processingStatus, "processing"),
      ),
    );
}

export async function markWebhookEventProcessed(
  eventId: string,
): Promise<void> {
  await db
    .update(webhookEvents)
    .set({
      lastError: null,
      processedAt: new Date(),
      processingStatus: "processed",
    })
    .where(
      and(
        eq(webhookEvents.id, eventId),
        eq(webhookEvents.processingStatus, "processing"),
      ),
    );
}

export async function fulfillPaidCheckout(
  eventId: string,
  input: PaidCheckoutEvent,
): Promise<
  | { status: "already_fulfilled" | "fulfilled" }
  | { reason: FulfillmentRejectionReason; status: "rejected" }
> {
  return db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select ${orders.id} from ${orders} where ${orders.id} = ${input.orderId} for update`,
    );

    const [order] = await transaction
      .select({
        couponId: orders.couponId,
        currency: orders.currency,
        discountSatang: orders.discountSatang,
        orderNumber: orders.orderNumber,
        providerCheckoutSessionId: orders.providerCheckoutSessionId,
        status: orders.status,
        totalSatang: orders.totalSatang,
        userId: orders.userId,
      })
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1);

    if (!order) {
      return { reason: "order_not_found", status: "rejected" };
    }

    const validation = validatePaidCheckout(
      {
        amountSatang: order.totalSatang,
        currency: order.currency,
        orderNumber: order.orderNumber,
        providerCheckoutSessionId:
          order.providerCheckoutSessionId,
      },
      input,
    );
    if (!validation.ok) {
      return { reason: validation.reason, status: "rejected" };
    }

    if (order.status === "paid") {
      await markWebhookProcessed(transaction, eventId);
      return { status: "already_fulfilled" };
    }

    if (
      order.status === "refunded" ||
      order.status === "partially_refunded"
    ) {
      return {
        reason: "invalid_order_status",
        status: "rejected",
      };
    }

    const productRows = await transaction
      .selectDistinct({ productId: skuProducts.productId })
      .from(orderItems)
      .innerJoin(
        skuProducts,
        eq(skuProducts.skuId, orderItems.skuId),
      )
      .where(eq(orderItems.orderId, input.orderId));

    const skuRows = await transaction
      .selectDistinct({ skuId: orderItems.skuId })
      .from(orderItems)
      .where(eq(orderItems.orderId, input.orderId));

    if (productRows.length === 0) {
      return {
        reason: "order_has_no_products",
        status: "rejected",
      };
    }

    const paidAt = new Date();
    await transaction
      .update(orders)
      .set({
        paidAt,
        providerCheckoutSessionId:
          input.providerCheckoutSessionId,
        status: "paid",
        updatedAt: paidAt,
      })
      .where(eq(orders.id, input.orderId));

    const [payment] = await transaction
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.orderId, input.orderId))
      .limit(1);

    if (payment) {
      await transaction
        .update(payments)
        .set({
          amountSatang: order.totalSatang,
          currency: order.currency,
          paidAt,
          providerCheckoutSessionId:
            input.providerCheckoutSessionId,
          providerPaymentIntentId: input.paymentIntentId,
          rawStatus: "paid",
          status: "succeeded",
          updatedAt: paidAt,
        })
        .where(eq(payments.id, payment.id));
    } else {
      await transaction.insert(payments).values({
        amountSatang: order.totalSatang,
        currency: order.currency,
        orderId: input.orderId,
        paidAt,
        providerCheckoutSessionId:
          input.providerCheckoutSessionId,
        providerPaymentIntentId: input.paymentIntentId,
        rawStatus: "paid",
        status: "succeeded",
      });
    }

    await transaction
      .insert(entitlements)
      .values(
        productRows.map(({ productId }) => ({
          productId,
          sourceOrderId: input.orderId,
          sourceType: "order" as const,
          userId: order.userId,
        })),
      )
      .onConflictDoNothing();

    await transaction
      .insert(skuEntitlements)
      .values(
        skuRows.map(({ skuId }) => ({
          skuId,
          sourceOrderId: input.orderId,
          sourceType: "order" as const,
          userId: order.userId,
        })),
      )
      .onConflictDoNothing();

    if (order.couponId) {
      await transaction
        .insert(couponRedemptions)
        .values({
          couponId: order.couponId,
          discountSatang: order.discountSatang,
          orderId: input.orderId,
          userId: order.userId,
        })
        .onConflictDoNothing({
          target: [
            couponRedemptions.couponId,
            couponRedemptions.orderId,
          ],
        });
    }

    await transaction.insert(outboxEvents).values({
      aggregateId: input.orderId,
      aggregateType: "order",
      payload: {
        orderId: input.orderId,
        orderNumber: order.orderNumber,
        productIds: productRows.map(({ productId }) => productId),
        userId: order.userId,
      },
      topic: "order.paid",
    });

    await markWebhookProcessed(transaction, eventId);
    return { status: "fulfilled" };
  });
}

export async function markCheckoutPaymentOutcome(
  eventId: string,
  input: CheckoutFailureEvent,
  outcome: "expired" | "failed",
): Promise<
  | { status: "already_final" | "updated" }
  | {
      reason:
        | "checkout_session_mismatch"
        | "order_not_found"
        | "order_number_mismatch";
      status: "rejected";
    }
> {
  return db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select ${orders.id} from ${orders} where ${orders.id} = ${input.orderId} for update`,
    );

    const [order] = await transaction
      .select({
        orderNumber: orders.orderNumber,
        providerCheckoutSessionId:
          orders.providerCheckoutSessionId,
        status: orders.status,
      })
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1);

    if (!order) {
      return { reason: "order_not_found", status: "rejected" };
    }
    if (order.orderNumber !== input.orderNumber) {
      return {
        reason: "order_number_mismatch",
        status: "rejected",
      };
    }
    if (
      order.providerCheckoutSessionId !== null &&
      input.providerCheckoutSessionId !== null &&
      order.providerCheckoutSessionId !==
        input.providerCheckoutSessionId
    ) {
      return {
        reason: "checkout_session_mismatch",
        status: "rejected",
      };
    }

    if (
      order.status === "paid" ||
      order.status === "refunded" ||
      order.status === "partially_refunded"
    ) {
      await markWebhookProcessed(transaction, eventId);
      return { status: "already_final" };
    }

    const updatedAt = new Date();
    await transaction
      .update(orders)
      .set({
        providerCheckoutSessionId:
          input.providerCheckoutSessionId ??
          order.providerCheckoutSessionId,
        status: outcome,
        updatedAt,
      })
      .where(eq(orders.id, input.orderId));

    await transaction
      .update(payments)
      .set({
        rawStatus: outcome,
        providerPaymentIntentId: input.paymentIntentId,
        status: outcome === "failed" ? "failed" : "cancelled",
        updatedAt,
      })
      .where(eq(payments.orderId, input.orderId));

    await markWebhookProcessed(transaction, eventId);
    return { status: "updated" };
  });
}

type WebhookTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

async function markWebhookProcessed(
  transaction: WebhookTransaction,
  eventId: string,
): Promise<void> {
  await transaction
    .update(webhookEvents)
    .set({
      lastError: null,
      processedAt: new Date(),
      processingStatus: "processed",
    })
    .where(
      and(
        eq(webhookEvents.id, eventId),
        eq(webhookEvents.processingStatus, "processing"),
      ),
    );
}
