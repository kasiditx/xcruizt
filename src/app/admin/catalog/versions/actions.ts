"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logServerError } from "@/lib/observability/logger";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { parseProductVersionInput } from "@/modules/catalog/application/product-version-input";
import {
  createAdminProductVersion,
  publishAdminProductVersion,
  updateAdminProductVersion,
  type VersionMutationResult,
} from "@/modules/catalog/infrastructure/admin-product-version-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export type VersionActionState = {
  fieldErrors?: Record<string, string[]>;
  message: string;
  status: "idle" | "error";
};

function failure(
  message: string,
  fieldErrors?: Record<string, string[]>,
): VersionActionState {
  return { fieldErrors, message, status: "error" };
}

function parse(formData: FormData) {
  return parseProductVersionInput({
    changelogMd: formData.get("changelogMd"),
    releaseNotesMd: formData.get("releaseNotesMd"),
    version: formData.get("version"),
  });
}

function mutationFailure(
  result: VersionMutationResult,
): VersionActionState | null {
  if (result === "not_found") return failure("ไม่พบ Product Version");
  if (result === "immutable") {
    return failure("Version ที่ Published แล้วแก้ไขย้อนหลังไม่ได้");
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

export async function createVersionAction(
  _state: VersionActionState,
  formData: FormData,
): Promise<VersionActionState> {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const parsed = parse(formData);
  const productId = formData.get("productId")?.toString() ?? "";

  if (!parsed.ok) {
    return failure("กรุณาตรวจข้อมูล Version", parsed.fieldErrors);
  }

  try {
    const result = await createAdminProductVersion(
      productId,
      parsed.value,
      account.id,
    );
    const known = mutationFailure(result);
    if (known) return known;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return failure("Product นี้มี Version number ดังกล่าวแล้ว");
    }
    logServerError("admin.product_version_create_failed", {
      operation: "create",
    }, error);
    return failure("บันทึก Version ไม่สำเร็จ");
  }

  revalidatePath("/admin/catalog/versions");
  redirect("/admin/catalog/versions?notice=created");
}

export async function updateVersionAction(
  versionId: string,
  _state: VersionActionState,
  formData: FormData,
): Promise<VersionActionState> {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const parsed = parse(formData);
  if (!parsed.ok) {
    return failure("กรุณาตรวจข้อมูล Version", parsed.fieldErrors);
  }

  try {
    const result = await updateAdminProductVersion(
      versionId,
      parsed.value,
      account.id,
    );
    const known = mutationFailure(result);
    if (known) return known;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return failure("Product นี้มี Version number ดังกล่าวแล้ว");
    }
    logServerError("admin.product_version_update_failed", {
      operation: "update",
    }, error);
    return failure("บันทึก Version ไม่สำเร็จ");
  }

  revalidatePath("/admin/catalog/versions");
  redirect("/admin/catalog/versions?notice=updated");
}

export async function publishVersionAction(formData: FormData) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.publishVersion,
  );
  const versionId = formData.get("versionId")?.toString() ?? "";
  const result = await publishAdminProductVersion(versionId, account.id);

  revalidatePath("/account/library");
  revalidatePath("/admin/catalog/versions");
  redirect(`/admin/catalog/versions?notice=${result}`);
}
