import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { env } from "@/lib/env/server";
import { hasExpectedOrigin } from "@/lib/http/origin";
import {
  CUSTOMER_DISCORD_SYNC_WINDOW_SECONDS,
  requestDiscordFullSyncForUser,
} from "@/modules/identity/infrastructure/discord-profile";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

function response(
  requestId: string,
  status: number,
  body: Record<string, unknown>,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    { ...body, requestId },
    {
      headers: { "cache-control": "no-store", ...headers },
      status,
    },
  );
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  if (!hasExpectedOrigin(request.headers, env.NEXT_PUBLIC_SITE_URL)) {
    return response(requestId, 403, {
      error: { code: "invalid_origin" },
      ok: false,
    });
  }

  const resolution = await getCurrentAccountResolution();
  if (resolution.status !== "ready") {
    return response(requestId, 401, {
      error: { code: "authentication_required" },
      ok: false,
    });
  }

  const result = await requestDiscordFullSyncForUser(
    resolution.account.id,
  );
  if (result === "rate_limited") {
    return response(
      requestId,
      429,
      { error: { code: result }, ok: false },
      {
        "retry-after": String(
          CUSTOMER_DISCORD_SYNC_WINDOW_SECONDS,
        ),
      },
    );
  }
  if (result === "not_linked" || result === "customer_inactive") {
    return response(requestId, 409, {
      error: { code: result },
      ok: false,
    });
  }

  return response(requestId, 202, {
    data: { status: result },
    ok: true,
  });
}
