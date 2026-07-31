export type StripeWebhookAction =
  | { kind: "expire" }
  | { kind: "fail" }
  | { kind: "fulfill" }
  | {
      kind: "ignore" | "reject";
      reason:
        | "checkout_payment_pending"
        | "successful_event_not_paid"
        | "unsupported_event";
    };

type PaidCheckoutFacts = {
  amountSatang: number | null;
  currency: string | null;
  orderNumber: string | null;
  providerCheckoutSessionId: string | null;
};

export type PaidCheckoutMismatchReason =
  | "amount_mismatch"
  | "checkout_session_mismatch"
  | "currency_mismatch"
  | "order_number_mismatch";

export function resolveStripeWebhookAction(
  eventType: string,
  paymentStatus: string | null,
): StripeWebhookAction {
  if (eventType === "checkout.session.completed") {
    return paymentStatus === "paid"
      ? { kind: "fulfill" }
      : { kind: "ignore", reason: "checkout_payment_pending" };
  }

  if (eventType === "checkout.session.async_payment_succeeded") {
    return paymentStatus === "paid"
      ? { kind: "fulfill" }
      : { kind: "reject", reason: "successful_event_not_paid" };
  }

  if (eventType === "checkout.session.async_payment_failed") {
    return { kind: "fail" };
  }

  if (eventType === "payment_intent.payment_failed") {
    return { kind: "fail" };
  }

  if (eventType === "checkout.session.expired") {
    return { kind: "expire" };
  }

  return { kind: "ignore", reason: "unsupported_event" };
}

export function validatePaidCheckout(
  expected: PaidCheckoutFacts,
  received: PaidCheckoutFacts,
):
  | { ok: true }
  | { ok: false; reason: PaidCheckoutMismatchReason } {
  if (expected.orderNumber !== received.orderNumber) {
    return { ok: false, reason: "order_number_mismatch" };
  }

  if (
    expected.providerCheckoutSessionId !== null &&
    expected.providerCheckoutSessionId !==
      received.providerCheckoutSessionId
  ) {
    return { ok: false, reason: "checkout_session_mismatch" };
  }

  if (
    expected.currency?.toUpperCase() !==
    received.currency?.toUpperCase()
  ) {
    return { ok: false, reason: "currency_mismatch" };
  }

  if (expected.amountSatang !== received.amountSatang) {
    return { ok: false, reason: "amount_mismatch" };
  }

  return { ok: true };
}
