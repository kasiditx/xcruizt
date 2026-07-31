import "server-only";

import {
  and,
  eq,
  ne,
  sql,
} from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  entitlements,
  orderItems,
  orders,
  outboxEvents,
  payments,
  refunds,
  skuProducts,
} from "@/db/schema";

export async function findRefundablePayment(paymentId: string) {
  const [payment] = await db
    .select({
      amountSatang: payments.amountSatang,
      currency: payments.currency,
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      paymentId: payments.id,
      paymentIntentId: payments.providerPaymentIntentId,
      status: payments.status,
      userId: orders.userId,
    })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (
    !payment ||
    payment.status !== "succeeded" ||
    !payment.paymentIntentId ||
    payment.currency !== "THB"
  ) {
    return null;
  }
  return {
    ...payment,
    paymentIntentId: payment.paymentIntentId,
  };
}

type ProviderRefundStatus =
  | "canceled"
  | "failed"
  | "pending"
  | "requires_action"
  | "succeeded"
  | null;

function mapRefundStatus(
  status: ProviderRefundStatus,
): "cancelled" | "failed" | "pending" | "succeeded" {
  if (status === "succeeded") return "succeeded";
  if (status === "failed") return "failed";
  if (status === "canceled") return "cancelled";
  return "pending";
}

type RefundTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

type RefundPaymentContext = {
  amountSatang: number;
  orderId: string;
  orderNumber: string;
  userId: string;
};

async function applySuccessfulFullRefund(
  transaction: RefundTransaction,
  paymentId: string,
  payment: RefundPaymentContext,
  providerRefundId: string,
  now: Date,
): Promise<void> {
  await transaction
    .update(payments)
    .set({
      refundedAt: now,
      status: "refunded",
      updatedAt: now,
    })
    .where(eq(payments.id, paymentId));
  await transaction
    .update(orders)
    .set({ status: "refunded", updatedAt: now })
    .where(eq(orders.id, payment.orderId));

  const ownedByOrder = await transaction
    .select({
      entitlementId: entitlements.id,
      productId: entitlements.productId,
    })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.sourceOrderId, payment.orderId),
        eq(entitlements.status, "active"),
      ),
    );

  for (const entitlement of ownedByOrder) {
    const [alternateOrder] = await transaction
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .innerJoin(
        skuProducts,
        eq(skuProducts.skuId, orderItems.skuId),
      )
      .where(
        and(
          eq(orders.userId, payment.userId),
          eq(orders.status, "paid"),
          ne(orders.id, payment.orderId),
          eq(skuProducts.productId, entitlement.productId),
        ),
      )
      .limit(1);

    if (alternateOrder) {
      await transaction
        .update(entitlements)
        .set({ sourceOrderId: alternateOrder.id })
        .where(eq(entitlements.id, entitlement.entitlementId));
    } else {
      await transaction
        .update(entitlements)
        .set({
          revokedAt: now,
          revokedReason: `Full refund ${providerRefundId}`,
          status: "revoked",
        })
        .where(eq(entitlements.id, entitlement.entitlementId));
    }
  }
}

export async function recordFullRefund(input: {
  adminUserId: string;
  paymentId: string;
  providerRefundId: string;
  providerStatus: ProviderRefundStatus;
  reason: string;
}): Promise<"already_recorded" | "recorded"> {
  return db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select ${payments.id} from ${payments} where ${payments.id} = ${input.paymentId} for update`,
    );
    const [payment] = await transaction
      .select({
        amountSatang: payments.amountSatang,
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        paymentStatus: payments.status,
        userId: orders.userId,
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(eq(payments.id, input.paymentId))
      .limit(1);
    if (!payment) throw new Error("Refund payment no longer exists.");

    const [existing] = await transaction
      .select({ id: refunds.id })
      .from(refunds)
      .where(eq(refunds.providerRefundId, input.providerRefundId))
      .limit(1);
    if (existing) return "already_recorded";

    const status = mapRefundStatus(input.providerStatus);
    const now = new Date();
    const [created] = await transaction
      .insert(refunds)
      .values({
        amountSatang: payment.amountSatang,
        paymentId: input.paymentId,
        providerRefundId: input.providerRefundId,
        reason: input.reason,
        requestedBy: input.adminUserId,
        status,
        updatedAt: now,
      })
      .returning({ id: refunds.id });
    if (!created) throw new Error("Refund insert returned no identifier.");

    if (status === "succeeded") {
      await applySuccessfulFullRefund(
        transaction,
        input.paymentId,
        payment,
        input.providerRefundId,
        now,
      );
    }

    await transaction.insert(adminAuditLogs).values({
      action: "payment.refund.create",
      adminUserId: input.adminUserId,
      afterData: {
        amountSatang: payment.amountSatang,
        orderId: payment.orderId,
        providerRefundId: input.providerRefundId,
        reason: input.reason,
        refundId: created.id,
        status,
      },
      beforeData: { paymentStatus: payment.paymentStatus },
      entityId: created.id,
      entityType: "refund",
    });
    await transaction.insert(outboxEvents).values({
      aggregateId: created.id,
      aggregateType: "refund",
      payload: {
        orderId: payment.orderId,
        orderNumber: payment.orderNumber,
        refundId: created.id,
        status,
        userId: payment.userId,
      },
      topic:
        status === "succeeded"
          ? "refund.completed"
          : "refund.created",
    });

    return "recorded";
  });
}

export async function reconcileRecordedRefund(input: {
  amountSatang: number;
  providerRefundId: string;
  providerStatus: ProviderRefundStatus;
}): Promise<"amount_mismatch" | "not_found" | "updated"> {
  return db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select ${refunds.id} from ${refunds} where ${refunds.providerRefundId} = ${input.providerRefundId} for update`,
    );
    const [refund] = await transaction
      .select({
        amountSatang: refunds.amountSatang,
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        paymentId: payments.id,
        status: refunds.status,
        userId: orders.userId,
      })
      .from(refunds)
      .innerJoin(payments, eq(payments.id, refunds.paymentId))
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(eq(refunds.providerRefundId, input.providerRefundId))
      .limit(1);
    if (!refund) return "not_found";
    if (refund.amountSatang !== input.amountSatang) {
      return "amount_mismatch";
    }

    const status = mapRefundStatus(input.providerStatus);
    const now = new Date();
    if (status === "succeeded" && refund.status !== "succeeded") {
      await applySuccessfulFullRefund(
        transaction,
        refund.paymentId,
        refund,
        input.providerRefundId,
        now,
      );
    }

    await transaction
      .update(refunds)
      .set({ status, updatedAt: now })
      .where(eq(refunds.providerRefundId, input.providerRefundId));
    await transaction.insert(outboxEvents).values({
      aggregateId: refund.paymentId,
      aggregateType: "refund",
      payload: {
        orderId: refund.orderId,
        orderNumber: refund.orderNumber,
        providerRefundId: input.providerRefundId,
        status,
        userId: refund.userId,
      },
      topic: "refund.status_changed",
    });

    return "updated";
  });
}
