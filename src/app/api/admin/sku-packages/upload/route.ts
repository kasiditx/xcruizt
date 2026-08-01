import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getR2Environment } from "@/lib/env/r2";
import { env } from "@/lib/env/server";
import { hasExpectedOrigin } from "@/lib/http/origin";
import { logServerError } from "@/lib/observability/logger";
import { authorizeAdminApi } from "@/modules/administration/infrastructure/api-authorization";
import {
  getSkuPackageUploadTarget,
  createStagingSkuPackageFile,
} from "@/modules/catalog/infrastructure/admin-file-repository";
import {
  MAX_PRODUCT_FILE_SIZE_BYTES,
  parseSkuPackageUploadInput,
} from "@/modules/catalog/application/file-upload-input";
import { createR2UploadUrl } from "@/modules/catalog/infrastructure/r2-file-upload";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

function response(
  requestId: string,
  status: number,
  body: Record<string, unknown>,
) {
  return NextResponse.json(
    { ...body, requestId },
    { headers: { "cache-control": "no-store" }, status },
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

  const authorization = await authorizeAdminApi(ADMIN_PERMISSIONS.writeProduct);
  if (authorization.status !== "ready") {
    return response(
      requestId,
      authorization.status === "unauthenticated" ? 401 : 403,
      {
        error: {
          code:
            authorization.status === "unauthenticated"
              ? "authentication_required"
              : authorization.status === "mfa_required"
                ? "mfa_required"
                : "permission_denied",
        },
        ok: false,
      },
    );
  }

  let environment: ReturnType<typeof getR2Environment>;
  try {
    environment = getR2Environment();
  } catch {
    return response(requestId, 503, {
      error: { code: "upload_provider_unavailable" },
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

  const skuId =
    typeof body === "object" && body !== null && "skuId" in body &&
    typeof body.skuId === "string"
      ? body.skuId
      : null;
  if (!skuId) {
    return response(requestId, 400, {
      error: { code: "invalid_request" },
      ok: false,
    });
  }

  const target = await getSkuPackageUploadTarget(skuId);
  if (!target) {
    return response(requestId, 404, {
      error: { code: "sku_not_found" },
      ok: false,
    });
  }

  const parsed = parseSkuPackageUploadInput(body, target.skuType);
  if (!parsed.ok) {
    return response(requestId, 400, {
      error: { code: "invalid_file", fieldErrors: parsed.fieldErrors },
      ok: false,
    });
  }
  if (parsed.value.fileSizeBytes > MAX_PRODUCT_FILE_SIZE_BYTES) {
    return response(requestId, 400, {
      error: { code: "invalid_file" },
      ok: false,
    });
  }

  const extension =
    parsed.value.originalFilename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ??
    "";
  const storageKey = `sku-packages/${skuId}/${randomUUID()}${extension}`;

  try {
    const signedUpload = await createR2UploadUrl({
      environment,
      storageKey,
      upload: parsed.value,
    });
    const staged = await createStagingSkuPackageFile({
      adminUserId: authorization.account.id,
      bucket: environment.bucketPrivate,
      storageKey,
      upload: parsed.value,
    });
    if (!staged) {
      return response(requestId, 409, {
        error: { code: "sku_is_not_uploadable" },
        ok: false,
      });
    }

    return response(requestId, 200, {
      data: { ...signedUpload, fileId: staged.fileId },
      ok: true,
    });
  } catch (error) {
    logServerError("admin.sku_package_upload_preparation_failed", {
      requestId,
      skuId,
    }, error);
    return response(requestId, 502, {
      error: { code: "upload_preparation_failed" },
      ok: false,
    });
  }
}
