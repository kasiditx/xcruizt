import "server-only";

import { notFound, redirect } from "next/navigation";

import {
  hasRequiredPermission,
  type AdminPermission,
} from "@/modules/identity/domain/permissions";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";
import { requireAdminMfa } from "@/modules/identity/infrastructure/admin-mfa";

export async function requireAdminPermission(
  requiredPermission: AdminPermission,
) {
  const resolution = await getCurrentAccountResolution();

  if (resolution.status === "anonymous") {
    redirect("/auth/login?next=/admin");
  }

  if (resolution.status === "profile_required") {
    redirect("/auth/complete-profile?next=/admin");
  }

  if (
    !hasRequiredPermission(
      new Set(resolution.account.admin.permissionCodes),
      requiredPermission,
    )
  ) {
    notFound();
  }

  await requireAdminMfa();

  return resolution.account;
}
