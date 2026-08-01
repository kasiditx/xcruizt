import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getR2Environment } from "@/lib/env/r2";
import { env } from "@/lib/env/server";
import {
  extractClientIp,
  hashSensitiveValue,
} from "@/lib/http/client-fingerprint";
import { hasExpectedOrigin } from "@/lib/http/origin";
import {
  logServerError,
  logServerWarning,
} from "@/lib/observability/logger";
import { consumeSecurityRateLimits } from "@/lib/security/rate-limit";
import { evaluateDownloadRateLimit } from "@/modules/entitlements/application/download-policy";
import {
  authorizeProductDownload,
  authorizeSkuPackageDownload,
  getRecentDownloadAttemptCounts,
  recordDownloadEvent,
} from "@/modules/entitlements/infrastructure/download-repository";
import {
  createR2DownloadUrl,
  DOWNLOAD_URL_TTL_SECONDS,
} from "@/modules/entitlements/infrastructure/r2-download";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

const DOWNLOAD_WINDOW_MS = 60 * 60 * 1000;
const DOWNLOAD_USER_LIMIT = 10;
const DOWNLOAD_IP_LIMIT = 30;
const downloadRequestSchema = z
  .object({
    fileId: z.uuid(),
    productId: z.uuid().optional(),
    skuId: z.uuid().optional(),
  })
  .refine(({ productId, skuId }) => Boolean(productId) !== Boolean(skuId), {
    message: "Exactly one download owner is required.",
  });

function response(
  requestId: string,
  status: number,
  body: Record<string, unknown>,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    { ...body, requestId },
    {
      headers: {
        "cache-control": "no-store",
        ...headers,
      },
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

  const clientIp = extractClientIp(request.headers);
  try {
    const rateLimit = await consumeSecurityRateLimits([
      {
        identifierParts: [resolution.account.id],
        scope: "download_user",
      },
      {
        identifierParts: [clientIp],
        scope: "download_ip",
      },
    ]);
    if (!rateLimit.allowed) {
      logServerWarning("download.rate_limited", { requestId });
      return response(
        requestId,
        429,
        {
          error: { code: "download_rate_limited" },
          ok: false,
        },
        { "retry-after": String(rateLimit.retryAfterSeconds) },
      );
    }
  } catch {
    logServerError("download.rate_limit_unavailable", { requestId });
    return response(requestId, 503, {
      error: { code: "rate_limit_unavailable" },
      ok: false,
    });
  }

  let r2Environment: ReturnType<typeof getR2Environment>;
  try {
    r2Environment = getR2Environment();
  } catch {
    return response(requestId, 503, {
      error: { code: "download_provider_unavailable" },
      ok: false,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response(requestId, 400, {
      error: { code: "invalid_request" },
      ok: false,
    });
  }

  const parsed = downloadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return response(requestId, 400, {
      error: { code: "invalid_request" },
      ok: false,
    });
  }

  const download = parsed.data.productId
    ? await authorizeProductDownload(
        resolution.account.id,
        parsed.data.productId,
        parsed.data.fileId,
      )
    : await authorizeSkuPackageDownload(
        resolution.account.id,
        parsed.data.skuId!,
        parsed.data.fileId,
      );
  if (!download) {
    return response(requestId, 404, {
      error: { code: "download_not_available" },
      ok: false,
    });
  }

  const ipHash = clientIp
    ? hashSensitiveValue(
        clientIp,
        r2Environment.privacyHashSecret,
      )
    : null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 512);
  const userAgentHash = userAgent
    ? hashSensitiveValue(
        userAgent,
        r2Environment.privacyHashSecret,
      )
    : null;
  const attempts = await getRecentDownloadAttemptCounts({
    ipHash,
    userId: resolution.account.id,
    windowStartedAt: new Date(Date.now() - DOWNLOAD_WINDOW_MS),
  });
  const rateLimit = evaluateDownloadRateLimit({
    ...attempts,
    ipLimit: DOWNLOAD_IP_LIMIT,
    userLimit: DOWNLOAD_USER_LIMIT,
  });

  if (!rateLimit.allowed) {
    await recordDownloadEvent({
      download,
      ipHash,
      result: "rate_limited",
      userAgentHash,
      userId: resolution.account.id,
    });
    return response(
      requestId,
      429,
      {
        error: { code: "download_rate_limited" },
        ok: false,
      },
      { "retry-after": String(DOWNLOAD_WINDOW_MS / 1000) },
    );
  }

  let downloadUrl: string;
  try {
    downloadUrl = await createR2DownloadUrl(
      r2Environment,
      download,
    );
    const signedUrl = new URL(downloadUrl);
    if (
      signedUrl.protocol !== "https:" ||
      signedUrl.hostname !==
        `${r2Environment.accountId}.r2.cloudflarestorage.com`
    ) {
      throw new Error("Unexpected signed download origin.");
    }
  } catch {
    logServerError("download.presign_failed", {
      fileId: download.fileId,
      requestId,
    });
    return response(requestId, 503, {
      error: { code: "download_provider_unavailable" },
      ok: false,
    });
  }

  await recordDownloadEvent({
    download,
    ipHash,
    result: "allowed",
    userAgentHash,
    userId: resolution.account.id,
  });

  return response(requestId, 200, {
    data: {
      downloadUrl,
      expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
      filename: download.originalFilename,
    },
    ok: true,
  });
}
