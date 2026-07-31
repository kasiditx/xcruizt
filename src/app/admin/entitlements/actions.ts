"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  parseManualEntitlementGrant,
  parseManualEntitlementRevoke,
} from "@/modules/administration/application/entitlement-input";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import {
  grantManualEntitlement,
  revokeManualEntitlement,
} from "@/modules/administration/infrastructure/entitlement-manager-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export async function grantEntitlementAction(formData: FormData) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.grantEntitlement,
  );
  const parsed = parseManualEntitlementGrant({
    productId: formData.get("productId"),
    reason: formData.get("reason"),
    userId: formData.get("userId"),
  });
  if (!parsed.ok) {
    redirect("/admin/entitlements?notice=invalid");
  }

  const result = await grantManualEntitlement({
    adminUserId: account.id,
    ...parsed.value,
  });
  revalidatePath("/account/library");
  revalidatePath("/admin/entitlements");
  redirect(`/admin/entitlements?notice=${result}`);
}

export async function revokeEntitlementAction(formData: FormData) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.grantEntitlement,
  );
  const parsed = parseManualEntitlementRevoke({
    entitlementId: formData.get("entitlementId"),
    reason: formData.get("reason"),
  });
  if (!parsed.ok) {
    redirect("/admin/entitlements?notice=invalid");
  }

  const result = await revokeManualEntitlement({
    adminUserId: account.id,
    ...parsed.value,
  });
  revalidatePath("/account/library");
  revalidatePath("/admin/entitlements");
  redirect(`/admin/entitlements?notice=${result}`);
}
