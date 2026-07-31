import "server-only";

import {
  hasRequiredPermission,
  type AdminPermission,
} from "@/modules/identity/domain/permissions";
import {
  getCurrentAccountResolution,
} from "@/modules/identity/infrastructure/current-account";
import { hasRequiredAdminMfa } from "@/modules/identity/infrastructure/admin-mfa";

export async function authorizeAdminApi(
  permission: AdminPermission,
) {
  const resolution = await getCurrentAccountResolution();
  if (resolution.status !== "ready") {
    return { status: "unauthenticated" as const };
  }
  if (
    !hasRequiredPermission(
      new Set(resolution.account.admin.permissionCodes),
      permission,
    )
  ) {
    return { status: "forbidden" as const };
  }
  if (!(await hasRequiredAdminMfa())) {
    return { status: "mfa_required" as const };
  }

  return {
    account: resolution.account,
    status: "ready" as const,
  };
}
