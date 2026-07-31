"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logServerError } from "@/lib/observability/logger";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { parseProductInput } from "@/modules/catalog/application/product-input";
import {
  createAdminProduct,
  updateAdminProduct,
} from "@/modules/catalog/infrastructure/admin-product-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export type ProductActionState = {
  fieldErrors?: Record<string, string[]>;
  message: string;
  status: "idle" | "error";
};

function getProductInput(formData: FormData) {
  return {
    brandName: formData.get("brandName"),
    collectionId: formData.get("collectionId"),
    compatibilityJson: formData.get("compatibilityJson"),
    description: formData.get("description"),
    isIndexable: formData.get("isIndexable"),
    mood: formData.get("mood"),
    name: formData.get("name"),
    schemaCategory: formData.get("schemaCategory"),
    seoDescription: formData.get("seoDescription"),
    seoTitle: formData.get("seoTitle"),
    shortDescription: formData.get("shortDescription"),
    slug: formData.get("slug"),
    status: formData.get("status"),
  };
}

function databaseErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return null;
}

function failure(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ProductActionState {
  return {
    fieldErrors,
    message,
    status: "error",
  };
}

function databaseFailure(error: unknown): ProductActionState | null {
  const code = databaseErrorCode(error);

  if (code === "23505") {
    return failure("Slug นี้ถูกใช้งานแล้ว", {
      slug: ["Slug ต้องไม่ซ้ำกับ Product อื่น"],
    });
  }

  if (code === "23503") {
    return failure("Collection ที่เลือกไม่มีอยู่แล้ว", {
      collectionId: ["กรุณาเลือก Collection ใหม่"],
    });
  }

  return null;
}

export async function createProductAction(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const parsed = parseProductInput(getProductInput(formData));

  if (!parsed.ok) {
    return failure("กรุณาตรวจข้อมูล Product ที่ระบุ", parsed.fieldErrors);
  }

  try {
    await createAdminProduct(parsed.value, account.id);
  } catch (error) {
    const knownFailure = databaseFailure(error);
    if (knownFailure) {
      return knownFailure;
    }

    logServerError("admin.catalog_product_create_failed", {
      operation: "create",
    }, error);
    return failure("บันทึก Product ไม่สำเร็จ กรุณาลองใหม่");
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog/products");
  redirect("/admin/catalog/products?notice=created");
}

export async function updateProductAction(
  productId: string,
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const parsed = parseProductInput(getProductInput(formData));

  if (!parsed.ok) {
    return failure("กรุณาตรวจข้อมูล Product ที่ระบุ", parsed.fieldErrors);
  }

  try {
    const result = await updateAdminProduct(
      productId,
      parsed.value,
      account.id,
    );

    if (result === "not_found") {
      return failure("ไม่พบ Product ที่ต้องการแก้ไข");
    }
  } catch (error) {
    const knownFailure = databaseFailure(error);
    if (knownFailure) {
      return knownFailure;
    }

    logServerError("admin.catalog_product_update_failed", {
      operation: "update",
    }, error);
    return failure("บันทึก Product ไม่สำเร็จ กรุณาลองใหม่");
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/products/${parsed.value.slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/catalog/products");
  redirect("/admin/catalog/products?notice=updated");
}
