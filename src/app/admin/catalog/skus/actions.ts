"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logServerError } from "@/lib/observability/logger";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { parseSkuInput } from "@/modules/catalog/application/sku-input";
import {
  createAdminSku,
  updateAdminSku,
  type SkuMutationResult,
} from "@/modules/catalog/infrastructure/admin-sku-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export type SkuActionState = {
  fieldErrors?: Record<string, string[]>;
  message: string;
  status: "idle" | "error";
};

function failure(
  message: string,
  fieldErrors?: Record<string, string[]>,
): SkuActionState {
  return { fieldErrors, message, status: "error" };
}

function getSkuInput(formData: FormData) {
  return {
    compareAtPriceThaiBaht: formData.get("compareAtPriceThaiBaht"),
    currency: formData.get("currency"),
    name: formData.get("name"),
    priceThaiBaht: formData.get("priceThaiBaht"),
    productIds: formData.getAll("productIds"),
    purchaseLimit: formData.get("purchaseLimit"),
    skuCode: formData.get("skuCode"),
    skuType: formData.get("skuType"),
    slug: formData.get("slug"),
    status: formData.get("status"),
    stripePriceId: formData.get("stripePriceId"),
  };
}

function mutationFailure(
  result: SkuMutationResult,
): SkuActionState | null {
  if (result.status === "missing_products") {
    return failure("Product ที่เลือกบางรายการไม่มีอยู่แล้ว", {
      productIds: ["กรุณาเลือก Product grants ใหม่"],
    });
  }

  if (result.status === "unpublished_products") {
    return failure("ยังเปิดขาย SKU นี้ไม่ได้", {
      productIds: [
        "SKU ที่ Active ต้องให้สิทธิ์เฉพาะ Product ที่ Published แล้ว",
      ],
    });
  }

  if (result.status === "not_found") {
    return failure("ไม่พบ SKU ที่ต้องการแก้ไข");
  }

  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function createSkuAction(
  _previousState: SkuActionState,
  formData: FormData,
): Promise<SkuActionState> {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const parsed = parseSkuInput(getSkuInput(formData));

  if (!parsed.ok) {
    return failure("กรุณาตรวจข้อมูล SKU ที่ระบุ", parsed.fieldErrors);
  }

  try {
    const result = await createAdminSku(parsed.value, account.id);
    const knownFailure = mutationFailure(result);
    if (knownFailure) {
      return knownFailure;
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return failure("SKU code หรือ slug นี้ถูกใช้งานแล้ว");
    }

    logServerError("admin.catalog_sku_create_failed", {
      operation: "create",
    }, error);
    return failure("บันทึก SKU ไม่สำเร็จ กรุณาลองใหม่");
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog/skus");
  redirect("/admin/catalog/skus?notice=created");
}

export async function updateSkuAction(
  skuId: string,
  _previousState: SkuActionState,
  formData: FormData,
): Promise<SkuActionState> {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const parsed = parseSkuInput(getSkuInput(formData));

  if (!parsed.ok) {
    return failure("กรุณาตรวจข้อมูล SKU ที่ระบุ", parsed.fieldErrors);
  }

  try {
    const result = await updateAdminSku(skuId, parsed.value, account.id);
    const knownFailure = mutationFailure(result);
    if (knownFailure) {
      return knownFailure;
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return failure("SKU code หรือ slug นี้ถูกใช้งานแล้ว");
    }

    logServerError("admin.catalog_sku_update_failed", {
      operation: "update",
    }, error);
    return failure("บันทึก SKU ไม่สำเร็จ กรุณาลองใหม่");
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog/skus");
  redirect("/admin/catalog/skus?notice=updated");
}
