import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getR2Environment } from "@/lib/env/r2";
import { env } from "@/lib/env/server";
import { hasExpectedOrigin } from "@/lib/http/origin";
import { logServerError } from "@/lib/observability/logger";
import { authorizeAdminApi } from "@/modules/administration/infrastructure/api-authorization";
import {
  finalizeStagingVersionFile,
  findStagingVersionFile,
} from "@/modules/catalog/infrastructure/admin-file-repository";
import { verifyR2UploadedObject } from "@/modules/catalog/infrastructure/r2-file-upload";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

const requestSchema = z.object({ fileId: z.uuid() });

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
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return response(requestId, 400, {
      error: { code: "invalid_request" },
      ok: false,
    });
  }

  const file = await findStagingVersionFile(parsed.data.fileId);
  if (
    !file ||
    file.status !== "staging" ||
    file.versionStatus !== "draft"
  ) {
    return response(requestId, 404, {
      error: { code: "staging_file_not_found" },
      ok: false,
    });
  }

  let verified: boolean;
  try {
    verified = await verifyR2UploadedObject({
      contentType: file.contentType,
      environment,
      expectedSizeBytes: file.fileSizeBytes,
      originalFilename: file.originalFilename,
      sha256: file.sha256,
      storageBucket: file.storageBucket,
      storageKey: file.storageKey,
    });
  } catch (error) {
    logServerError("admin.r2_upload_verification_failed", {
      fileId: file.id,
      requestId,
    }, error);
    return response(requestId, 502, {
      error: { code: "upload_verification_failed" },
      ok: false,
    });
  }

  const result = await finalizeStagingVersionFile({
    adminUserId: authorization.account.id,
    fileId: file.id,
    verified,
  });
  if (result !== "activated") {
    return response(requestId, 422, {
      error: {
        code:
          result === "quarantined"
            ? "file_integrity_mismatch"
            : "staging_file_not_found",
      },
      ok: false,
    });
  }

  return response(requestId, 200, {
    data: { fileId: file.id, status: "active" },
    ok: true,
  });
}
