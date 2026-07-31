"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logServerError } from "@/lib/observability/logger";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { parseCollectionInput } from "@/modules/catalog/application/collection-input";
import {
  createAdminCollection,
  updateAdminCollection,
} from "@/modules/catalog/infrastructure/admin-collection-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export type CollectionActionState = {
  status: "idle" | "error";
  message: string;
  fieldErrors?: Record<string, string[]>;
};

function getCollectionInput(formData: FormData) {
  return {
    accentKey: formData.get("accentKey"),
    description: formData.get("description"),
    name: formData.get("name"),
    seoDescription: formData.get("seoDescription"),
    seoTitle: formData.get("seoTitle"),
    slug: formData.get("slug"),
    sortOrder: formData.get("sortOrder"),
    status: formData.get("status"),
    tagline: formData.get("tagline"),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function actionFailure(
  message: string,
  fieldErrors?: Record<string, string[]>,
): CollectionActionState {
  return {
    status: "error",
    message,
    fieldErrors,
  };
}

export async function createCollectionAction(
  _previousState: CollectionActionState,
  formData: FormData,
): Promise<CollectionActionState> {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const parsed = parseCollectionInput(getCollectionInput(formData));

  if (!parsed.ok) {
    return actionFailure(
      "กรุณาตรวจข้อมูล Collection ที่ระบุ",
      parsed.fieldErrors,
    );
  }

  try {
    await createAdminCollection(parsed.value, account.id);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return actionFailure("Slug นี้ถูกใช้งานแล้ว", {
        slug: ["Slug ต้องไม่ซ้ำกับ Collection อื่น"],
      });
    }

    logServerError("admin.catalog_collection_create_failed", {
      operation: "create",
    }, error);
    return actionFailure("บันทึก Collection ไม่สำเร็จ กรุณาลองใหม่");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog/collections");
  redirect("/admin/catalog/collections?notice=created");
}

export async function updateCollectionAction(
  collectionId: string,
  _previousState: CollectionActionState,
  formData: FormData,
): Promise<CollectionActionState> {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const parsed = parseCollectionInput(getCollectionInput(formData));

  if (!parsed.ok) {
    return actionFailure(
      "กรุณาตรวจข้อมูล Collection ที่ระบุ",
      parsed.fieldErrors,
    );
  }

  try {
    const result = await updateAdminCollection(
      collectionId,
      parsed.value,
      account.id,
    );

    if (result === "not_found") {
      return actionFailure("ไม่พบ Collection ที่ต้องการแก้ไข");
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return actionFailure("Slug นี้ถูกใช้งานแล้ว", {
        slug: ["Slug ต้องไม่ซ้ำกับ Collection อื่น"],
      });
    }

    logServerError("admin.catalog_collection_update_failed", {
      operation: "update",
    }, error);
    return actionFailure("บันทึก Collection ไม่สำเร็จ กรุณาลองใหม่");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog/collections");
  redirect("/admin/catalog/collections?notice=updated");
}
