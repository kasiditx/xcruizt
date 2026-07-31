import "server-only";

import Stripe from "stripe";

export async function createStripeFullRefund(input: {
  amountSatang: number;
  instructionsEmail: string;
  orderId: string;
  orderNumber: string;
  paymentIntentId: string;
  refundRequestId: string;
  secretKey: string;
}): Promise<{
  amountSatang: number;
  providerRefundId: string;
  status:
    | "canceled"
    | "failed"
    | "pending"
    | "requires_action"
    | "succeeded"
    | null;
}> {
  const refund = await new Stripe(input.secretKey).refunds.create(
    {
      amount: input.amountSatang,
      instructions_email: input.instructionsEmail,
      metadata: {
        order_id: input.orderId,
        order_number: input.orderNumber,
      },
      payment_intent: input.paymentIntentId,
      reason: "requested_by_customer",
    },
    { idempotencyKey: `refund:${input.refundRequestId}` },
  );

  if (refund.amount !== input.amountSatang) {
    throw new Error("Stripe refund amount did not match the request.");
  }

  return {
    amountSatang: refund.amount,
    providerRefundId: refund.id,
    status:
      refund.status === "succeeded" ||
      refund.status === "failed" ||
      refund.status === "canceled" ||
      refund.status === "requires_action" ||
      refund.status === "pending"
        ? refund.status
        : null,
  };
}
