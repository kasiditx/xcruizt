import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getR2Environment } from "@/lib/env/r2";
import { env } from "@/lib/env/server";
import { hasExpectedOrigin } from "@/lib/http/origin";
import { logServerError } from "@/lib/observability/logger";
import { authorizeAdminApi } from "@/modules/administration/infrastructure/api-authorization";
import { parseFileUploadInput } from "@/modules/catalog/application/file-upload-input";
import {
  createStagingVersionFile,
  getDraftVersionUploadTarget,
} from "@/modules/catalog/infrastructure/admin-file-repository";
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

  const authorization = await authorizeAdminApi(
    ADMIN_PERMISSIONS.writeProduct,
  );
  if (authorization.status !== "ready") {
    let code = "permission_denied";
    if (authorization.status === "unauthenticated") {
      code = "authentication_required";
    } else if (authorization.status === "mfa_required") {
      code = "mfa_required";
    }
    return response(
      requestId,
      authorization.status === "unauthenticated" ? 401 : 403,
      {
        error: { code },
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

  const parsed = parseFileUploadInput(body);
  if (!parsed.ok) {
    return response(requestId, 400, {
      error: {
        code: "invalid_file",
        fieldErrors: parsed.fieldErrors,
      },
      ok: false,
    });
  }

  const target = await getDraftVersionUploadTarget(
    parsed.value.versionId,
  );
  if (!target) {
    return response(requestId, 404, {
      error: { code: "draft_version_not_found" },
      ok: false,
    });
  }

  const extension =
    parsed.value.originalFilename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ??
    "";
  const storageKey = `products/${target.productId}/${target.version}/${randomUUID()}${extension}`;

  try {
    const signedUpload = await createR2UploadUrl({
      environment,
      storageKey,
      upload: parsed.value,
    });
    const staged = await createStagingVersionFile({
      adminUserId: authorization.account.id,
      bucket: environment.bucketPrivate,
      storageKey,
      upload: parsed.value,
    });
    if (!staged) {
      return response(requestId, 409, {
        error: { code: "version_is_not_draft" },
        ok: false,
      });
    }

    return response(requestId, 200, {
      data: {
        ...signedUpload,
        fileId: staged.fileId,
      },
      ok: true,
    });
  } catch (error) {
    logServerError(
      "admin.r2_upload_preparation_failed",
      { requestId },
      error,
    );
    return response(requestId, 502, {
      error: { code: "upload_preparation_failed" },
      ok: false,
    });
  }
}
