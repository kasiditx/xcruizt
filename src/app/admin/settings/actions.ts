"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  assignAdminRole,
  removeAdminRole,
} from "@/modules/administration/infrastructure/admin-role-repository";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

const roleMutationSchema = z.object({
  roleId: z.uuid(),
  userId: z.uuid(),
});

function parse(formData: FormData) {
  return roleMutationSchema.safeParse({
    roleId: formData.get("roleId"),
    userId: formData.get("userId"),
  });
}

export async function assignRoleAction(formData: FormData) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.manageAdminRoles,
  );
  const parsed = parse(formData);
  if (!parsed.success) redirect("/admin/settings?notice=invalid");

  const result = await assignAdminRole({
    adminUserId: account.id,
    ...parsed.data,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  redirect(`/admin/settings?notice=${result}`);
}

export async function removeRoleAction(formData: FormData) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.manageAdminRoles,
  );
  const parsed = parse(formData);
  if (!parsed.success) redirect("/admin/settings?notice=invalid");

  const result = await removeAdminRole({
    adminUserId: account.id,
    ...parsed.data,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  redirect(`/admin/settings?notice=${result}`);
}
