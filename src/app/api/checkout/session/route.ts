import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/lib/env/server";
import { getStripeEnvironment } from "@/lib/env/stripe";
import { extractClientIp } from "@/lib/http/client-fingerprint";
import { hasExpectedOrigin } from "@/lib/http/origin";
import {
  logServerError,
  logServerWarning,
} from "@/lib/observability/logger";
import { consumeSecurityRateLimit } from "@/lib/security/rate-limit";
import { parseCheckoutRequest } from "@/modules/checkout/application/pricing";
import {
  createPendingOrder,
  getPersistedOrderQuote,
  markCheckoutOrderFailed,
  attachCheckoutSession,
  type PendingOrder,
} from "@/modules/checkout/infrastructure/order-repository";
import { getPriceQuoteForUser } from "@/modules/checkout/infrastructure/quote-repository";
import {
  createStripeCheckoutSession,
  retrieveStripeCheckoutSession,
} from "@/modules/checkout/infrastructure/stripe-checkout";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

function errorResponse(
  requestId: string,
  status: number,
  code: string,
  message: string,
) {
  return NextResponse.json(
    { error: { code, message }, ok: false, requestId },
    { status },
  );
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  if (!hasExpectedOrigin(request.headers, env.NEXT_PUBLIC_SITE_URL)) {
    return errorResponse(
      requestId,
      403,
      "invalid_origin",
      "ไม่อนุญาตให้ส่งคำขอจาก Origin นี้",
    );
  }

  const resolution = await getCurrentAccountResolution();
  if (resolution.status !== "ready") {
    return errorResponse(
      requestId,
      401,
      "authentication_required",
      "กรุณาเข้าสู่ระบบก่อนชำระเงิน",
    );
  }

  try {
    const rateLimit = await consumeSecurityRateLimit(
      "checkout_session",
      [
        resolution.account.id,
        extractClientIp(request.headers),
      ],
    );
    if (!rateLimit.allowed) {
      logServerWarning("checkout.session_rate_limited", { requestId });
      return NextResponse.json(
        {
          error: {
            code: "rate_limited",
            message: "เริ่ม Checkout บ่อยเกินไป กรุณารอสักครู่",
          },
          ok: false,
          requestId,
        },
        {
          headers: {
            "retry-after": String(rateLimit.retryAfterSeconds),
          },
          status: 429,
        },
      );
    }
  } catch {
    logServerError("checkout.session_rate_limit_unavailable", {
      requestId,
    });
    return errorResponse(
      requestId,
      503,
      "rate_limit_unavailable",
      "ระบบป้องกัน Checkout ขัดข้องชั่วคราว",
    );
  }

  let stripeEnvironment: ReturnType<typeof getStripeEnvironment>;
  try {
    stripeEnvironment = getStripeEnvironment();
  } catch {
    return errorResponse(
      requestId,
      503,
      "payment_provider_unavailable",
      "ระบบชำระเงินยังไม่พร้อมใช้งาน",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      requestId,
      400,
      "invalid_request",
      "ข้อมูล Checkout ไม่ถูกต้อง",
    );
  }

  const checkoutRequestId =
    typeof body === "object" && body !== null && "checkoutRequestId" in body
      ? z.uuid().safeParse(body.checkoutRequestId)
      : null;
  const checkout = parseCheckoutRequest(body);
  if (!checkoutRequestId?.success || !checkout.ok) {
    return errorResponse(
      requestId,
      400,
      "invalid_request",
      "ข้อมูล Checkout ไม่ถูกต้อง",
    );
  }

  const quoteResult = await getPriceQuoteForUser(
    resolution.account.id,
    checkout.value,
  );
  if (!quoteResult.ok || quoteResult.quote.totalSatang <= 0) {
    return errorResponse(
      requestId,
      422,
      quoteResult.ok ? "zero_total_not_supported" : quoteResult.reason,
      "Cart นี้ยังไม่สามารถชำระเงินได้",
    );
  }

  let pendingOrder: PendingOrder | null = null;
  try {
    const { order } = await createPendingOrder(
      resolution.account.id,
      checkoutRequestId.data,
      quoteResult.quote,
    );
    pendingOrder = order;

    const session = order.providerCheckoutSessionId
      ? await retrieveStripeCheckoutSession(
          stripeEnvironment.secretKey,
          order.providerCheckoutSessionId,
        )
      : await createStripeCheckoutSession(
          stripeEnvironment.secretKey,
          env.NEXT_PUBLIC_SITE_URL,
          order,
          await getPersistedOrderQuote(order.id),
        );

    if (!order.providerCheckoutSessionId) {
      await attachCheckoutSession(order, session.id);
    }

    return NextResponse.json({
      data: {
        checkoutUrl: session.url,
        orderNumber: order.orderNumber,
      },
      ok: true,
      requestId,
    });
  } catch {
    if (pendingOrder) {
      await markCheckoutOrderFailed(pendingOrder.id);
    }
    logServerError("checkout.session_creation_failed", {
      requestId,
    });
    return errorResponse(
      requestId,
      502,
      "checkout_session_failed",
      "สร้างหน้าชำระเงินไม่สำเร็จ กรุณาลองใหม่",
    );
  }
}
