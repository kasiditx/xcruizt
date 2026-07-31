import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { getStripeEnvironment } from "@/lib/env/stripe";
import { logServerError } from "@/lib/observability/logger";
import { reconcileRecordedRefund } from "@/modules/administration/infrastructure/refund-repository";
import { resolveStripeWebhookAction } from "@/modules/payments/application/stripe-webhook";
import {
  claimStripeWebhookEvent,
  fulfillPaidCheckout,
  markCheckoutPaymentOutcome,
  markWebhookEventFailed,
  markWebhookEventIgnored,
  markWebhookEventProcessed,
  type CheckoutFailureEvent,
  type PaidCheckoutEvent,
} from "@/modules/payments/infrastructure/stripe-webhook-repository";

const MAX_WEBHOOK_BODY_BYTES = 1_000_000;
const checkoutMetadataSchema = z.object({
  order_id: z.uuid(),
  order_number: z.string().trim().min(1).max(100),
});

function webhookResponse(
  requestId: string,
  status: number,
  body: Record<string, unknown>,
) {
  return NextResponse.json({ ...body, requestId }, { status });
}

function getPaymentIntentId(
  paymentIntent: Stripe.Checkout.Session["payment_intent"],
): string | null {
  if (typeof paymentIntent === "string") return paymentIntent;
  return paymentIntent?.id ?? null;
}

function parseCheckoutEvent(
  session: Stripe.Checkout.Session,
): {
  failure: CheckoutFailureEvent;
  paid: PaidCheckoutEvent;
} | null {
  const metadata = checkoutMetadataSchema.safeParse(session.metadata);
  if (!metadata.success) return null;

  const base = {
    orderId: metadata.data.order_id,
    orderNumber: metadata.data.order_number,
    paymentIntentId: getPaymentIntentId(session.payment_intent),
    providerCheckoutSessionId: session.id,
  };

  return {
    failure: base,
    paid: {
      ...base,
      amountSatang: session.amount_total,
      currency: session.currency,
    },
  };
}

function parsePaymentIntentFailure(
  paymentIntent: Stripe.PaymentIntent,
): CheckoutFailureEvent | null {
  const metadata = checkoutMetadataSchema.safeParse(
    paymentIntent.metadata,
  );
  if (!metadata.success) return null;

  return {
    orderId: metadata.data.order_id,
    orderNumber: metadata.data.order_number,
    paymentIntentId: paymentIntent.id,
    providerCheckoutSessionId: null,
  };
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return webhookResponse(requestId, 400, {
      error: { code: "missing_signature" },
      ok: false,
    });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_WEBHOOK_BODY_BYTES
  ) {
    return webhookResponse(requestId, 413, {
      error: { code: "payload_too_large" },
      ok: false,
    });
  }

  let stripeEnvironment: ReturnType<typeof getStripeEnvironment>;
  try {
    stripeEnvironment = getStripeEnvironment();
  } catch {
    return webhookResponse(requestId, 503, {
      error: { code: "payment_provider_unavailable" },
      ok: false,
    });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BODY_BYTES) {
    return webhookResponse(requestId, 413, {
      error: { code: "payload_too_large" },
      ok: false,
    });
  }

  let event: Stripe.Event;
  try {
    event = new Stripe(
      stripeEnvironment.secretKey,
    ).webhooks.constructEvent(
      rawBody,
      signature,
      stripeEnvironment.webhookSecret,
    );
  } catch {
    return webhookResponse(requestId, 400, {
      error: { code: "invalid_signature" },
      ok: false,
    });
  }

  const payloadHash = createHash("sha256")
    .update(rawBody)
    .digest("hex");

  let claim: Awaited<ReturnType<typeof claimStripeWebhookEvent>>;
  try {
    claim = await claimStripeWebhookEvent({
      eventType: event.type,
      payloadHash,
      providerEventId: event.id,
    });
  } catch (error) {
    logServerError("stripe.webhook_claim_failed", {
      providerEventId: event.id,
      requestId,
    }, error);
    return webhookResponse(requestId, 500, {
      error: { code: "webhook_processing_failed" },
      ok: false,
    });
  }

  if (claim.status === "payload_mismatch") {
    return webhookResponse(requestId, 400, {
      error: { code: "webhook_payload_mismatch" },
      ok: false,
    });
  }
  if (claim.status === "duplicate") {
    return webhookResponse(requestId, 200, {
      duplicate: true,
      ok: true,
      received: true,
    });
  }

  try {
    if (
      event.type === "refund.created" ||
      event.type === "refund.updated" ||
      event.type === "refund.failed"
    ) {
      const refund = event.data.object as Stripe.Refund;
      const providerStatus =
        refund.status === "succeeded" ||
        refund.status === "failed" ||
        refund.status === "canceled" ||
        refund.status === "requires_action" ||
        refund.status === "pending"
          ? refund.status
          : null;
      const result = await reconcileRecordedRefund({
        amountSatang: refund.amount,
        providerRefundId: refund.id,
        providerStatus,
      });
      if (result !== "updated") {
        await markWebhookEventFailed(claim.eventId, result);
        return webhookResponse(requestId, 200, {
          acceptedForReview: true,
          ok: true,
          received: true,
        });
      }

      await markWebhookEventProcessed(claim.eventId);
      return webhookResponse(requestId, 200, {
        ok: true,
        received: true,
      });
    }

    if (event.type === "payment_intent.payment_failed") {
      const failure = parsePaymentIntentFailure(
        event.data.object as Stripe.PaymentIntent,
      );
      if (!failure) {
        await markWebhookEventFailed(
          claim.eventId,
          "invalid_payment_intent_metadata",
        );
        return webhookResponse(requestId, 200, {
          acceptedForReview: true,
          ok: true,
          received: true,
        });
      }

      const result = await markCheckoutPaymentOutcome(
        claim.eventId,
        failure,
        "failed",
      );
      if (result.status === "rejected") {
        await markWebhookEventFailed(claim.eventId, result.reason);
        return webhookResponse(requestId, 200, {
          acceptedForReview: true,
          ok: true,
          received: true,
        });
      }

      return webhookResponse(requestId, 200, {
        ok: true,
        received: true,
      });
    }

    if (
      !event.type.startsWith("checkout.session.") ||
      !("payment_status" in event.data.object)
    ) {
      await markWebhookEventIgnored(
        claim.eventId,
        "unsupported_event",
      );
      return webhookResponse(requestId, 200, {
        ignored: true,
        ok: true,
        received: true,
      });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const action = resolveStripeWebhookAction(
      event.type,
      session.payment_status,
    );

    if (action.kind === "ignore") {
      await markWebhookEventIgnored(claim.eventId, action.reason);
      return webhookResponse(requestId, 200, {
        ignored: true,
        ok: true,
        received: true,
      });
    }

    if (action.kind === "reject") {
      await markWebhookEventFailed(claim.eventId, action.reason);
      return webhookResponse(requestId, 200, {
        acceptedForReview: true,
        ok: true,
        received: true,
      });
    }

    const checkoutEvent = parseCheckoutEvent(session);
    if (!checkoutEvent) {
      await markWebhookEventFailed(
        claim.eventId,
        "invalid_checkout_metadata",
      );
      return webhookResponse(requestId, 200, {
        acceptedForReview: true,
        ok: true,
        received: true,
      });
    }

    const result =
      action.kind === "fulfill"
        ? await fulfillPaidCheckout(claim.eventId, checkoutEvent.paid)
        : await markCheckoutPaymentOutcome(
            claim.eventId,
            checkoutEvent.failure,
            action.kind === "expire" ? "expired" : "failed",
          );

    if (result.status === "rejected") {
      await markWebhookEventFailed(claim.eventId, result.reason);
      return webhookResponse(requestId, 200, {
        acceptedForReview: true,
        ok: true,
        received: true,
      });
    }

    return webhookResponse(requestId, 200, {
      ok: true,
      received: true,
    });
  } catch (error) {
    try {
      await markWebhookEventFailed(
        claim.eventId,
        "transient_processing_error",
      );
    } catch (markFailure) {
      logServerError("stripe.webhook_failure_record_failed", {
        providerEventId: event.id,
        requestId,
      }, markFailure);
    }
    logServerError("stripe.webhook_processing_failed", {
      providerEventId: event.id,
      requestId,
    }, error);
    return webhookResponse(requestId, 500, {
      error: { code: "webhook_processing_failed" },
      ok: false,
    });
  }
}
