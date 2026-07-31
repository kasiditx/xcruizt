"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseCouponInput } from "@/modules/administration/application/coupon-input";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import {
  createAdminCoupon,
  updateAdminCouponStatus,
} from "@/modules/administration/infrastructure/coupon-admin-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

const statusSchema = z.object({
  couponId: z.uuid(),
  status: z.enum(["active", "expired", "paused"]),
});

export async function createCouponAction(formData: FormData) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeCoupon,
  );
  const parsed = parseCouponInput({
    code: formData.get("code"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    endsAt: formData.get("endsAt"),
    maximumDiscount: formData.get("maximumDiscount"),
    minimumAmount: formData.get("minimumAmount"),
    perUserLimit: formData.get("perUserLimit"),
    startsAt: formData.get("startsAt"),
    usageLimit: formData.get("usageLimit"),
  });
  if (!parsed.ok) redirect("/admin/coupons?notice=invalid");

  const result = await createAdminCoupon({
    adminUserId: account.id,
    coupon: parsed.value,
  });
  revalidatePath("/admin/coupons");
  redirect(`/admin/coupons?notice=${result}`);
}

export async function updateCouponStatusAction(formData: FormData) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeCoupon,
  );
  const parsed = statusSchema.safeParse({
    couponId: formData.get("couponId"),
    status: formData.get("status"),
  });
  if (!parsed.success) redirect("/admin/coupons?notice=invalid");

  const result = await updateAdminCouponStatus({
    adminUserId: account.id,
    ...parsed.data,
  });
  revalidatePath("/admin/coupons");
  redirect(`/admin/coupons?notice=${result}`);
}
