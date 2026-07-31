import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { env } from "@/lib/env/server";
import { extractClientIp } from "@/lib/http/client-fingerprint";
import { hasExpectedOrigin } from "@/lib/http/origin";
import {
  logServerError,
  logServerWarning,
} from "@/lib/observability/logger";
import { consumeSecurityRateLimit } from "@/lib/security/rate-limit";
import { parseCheckoutRequest } from "@/modules/checkout/application/pricing";
import { getPriceQuoteForUser } from "@/modules/checkout/infrastructure/quote-repository";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

function apiError(
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
    return apiError(
      requestId,
      403,
      "invalid_origin",
      "ไม่อนุญาตให้ส่งคำขอจาก Origin นี้",
    );
  }

  const resolution = await getCurrentAccountResolution();

  if (resolution.status !== "ready") {
    return apiError(
      requestId,
      401,
      "authentication_required",
      "กรุณาเข้าสู่ระบบก่อนตรวจราคา",
    );
  }

  try {
    const rateLimit = await consumeSecurityRateLimit(
      "checkout_quote",
      [
        resolution.account.id,
        extractClientIp(request.headers),
      ],
    );
    if (!rateLimit.allowed) {
      logServerWarning("checkout.quote_rate_limited", { requestId });
      return NextResponse.json(
        {
          error: {
            code: "rate_limited",
            message: "ตรวจราคาบ่อยเกินไป กรุณารอสักครู่",
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
    logServerError("checkout.quote_rate_limit_unavailable", {
      requestId,
    });
    return apiError(
      requestId,
      503,
      "rate_limit_unavailable",
      "ระบบป้องกัน Checkout ขัดข้องชั่วคราว",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(
      requestId,
      400,
      "invalid_request",
      "ข้อมูล Cart ไม่ถูกต้อง",
    );
  }

  const parsed = parseCheckoutRequest(body);
  if (!parsed.ok) {
    return apiError(
      requestId,
      400,
      "invalid_request",
      "ข้อมูล Cart ไม่ถูกต้อง",
    );
  }

  try {
    const result = await getPriceQuoteForUser(
      resolution.account.id,
      parsed.value,
    );
    if (!result.ok) {
      return apiError(
        requestId,
        422,
        result.reason,
        "ไม่สามารถใช้ราคา หรือตัวเลือกใน Cart นี้ได้",
      );
    }

    return NextResponse.json({
      data: result.quote,
      ok: true,
      requestId,
    });
  } catch {
    logServerError("checkout.quote_failed", { requestId });
    return apiError(
      requestId,
      500,
      "quote_failed",
      "ระบบตรวจราคาขัดข้องชั่วคราว",
    );
  }
}
