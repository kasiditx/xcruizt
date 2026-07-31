import { describe, expect, it } from "vitest";

import {
  resolveStripeWebhookAction,
  validatePaidCheckout,
} from "./stripe-webhook";

describe("resolveStripeWebhookAction", () => {
  it("fulfills a paid Checkout Session", () => {
    expect(
      resolveStripeWebhookAction(
        "checkout.session.completed",
        "paid",
      ),
    ).toEqual({ kind: "fulfill" });
  });

  it("waits for the asynchronous result when Checkout is not paid yet", () => {
    expect(
      resolveStripeWebhookAction(
        "checkout.session.completed",
        "unpaid",
      ),
    ).toEqual({
      kind: "ignore",
      reason: "checkout_payment_pending",
    });
  });

  it("fulfills a paid asynchronous Checkout Session", () => {
    expect(
      resolveStripeWebhookAction(
        "checkout.session.async_payment_succeeded",
        "paid",
      ),
    ).toEqual({ kind: "fulfill" });
  });

  it("rejects an inconsistent asynchronous success event", () => {
    expect(
      resolveStripeWebhookAction(
        "checkout.session.async_payment_succeeded",
        "unpaid",
      ),
    ).toEqual({
      kind: "reject",
      reason: "successful_event_not_paid",
    });
  });

  it("marks asynchronous failures and expired sessions", () => {
    expect(
      resolveStripeWebhookAction(
        "checkout.session.async_payment_failed",
        "unpaid",
      ),
    ).toEqual({ kind: "fail" });
    expect(
      resolveStripeWebhookAction(
        "checkout.session.expired",
        "unpaid",
      ),
    ).toEqual({ kind: "expire" });
    expect(
      resolveStripeWebhookAction(
        "payment_intent.payment_failed",
        null,
      ),
    ).toEqual({ kind: "fail" });
  });

  it("ignores unsupported event types", () => {
    expect(
      resolveStripeWebhookAction("customer.created", null),
    ).toEqual({ kind: "ignore", reason: "unsupported_event" });
  });
});

describe("validatePaidCheckout", () => {
  const expected = {
    amountSatang: 12_900,
    currency: "THB",
    orderNumber: "XRZ-20260731-ABC123",
    providerCheckoutSessionId: "cs_test_existing",
  };

  it("accepts an exact paid-order match", () => {
    expect(
      validatePaidCheckout(expected, {
        amountSatang: 12_900,
        currency: "thb",
        orderNumber: "XRZ-20260731-ABC123",
        providerCheckoutSessionId: "cs_test_existing",
      }),
    ).toEqual({ ok: true });
  });

  it.each([
    ["amount_mismatch", { amountSatang: 12_901 }],
    ["currency_mismatch", { currency: "usd" }],
    ["order_number_mismatch", { orderNumber: "XRZ-WRONG" }],
    [
      "checkout_session_mismatch",
      { providerCheckoutSessionId: "cs_test_other" },
    ],
  ] as const)("rejects %s", (reason, override) => {
    expect(
      validatePaidCheckout(expected, {
        amountSatang: 12_900,
        currency: "thb",
        orderNumber: "XRZ-20260731-ABC123",
        providerCheckoutSessionId: "cs_test_existing",
        ...override,
      }),
    ).toEqual({ ok: false, reason });
  });

  it("allows the webhook to attach a missing Checkout Session id", () => {
    expect(
      validatePaidCheckout(
        { ...expected, providerCheckoutSessionId: null },
        {
          amountSatang: 12_900,
          currency: "thb",
          orderNumber: "XRZ-20260731-ABC123",
          providerCheckoutSessionId: "cs_test_new",
        },
      ),
    ).toEqual({ ok: true });
  });
});
