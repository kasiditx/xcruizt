"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { env } from "@/lib/env/server";
import { resolvePublicMediaSource } from "@/modules/catalog/application/media-url";
import {
  createAdminProductMedia,
  removeAdminProductMedia,
} from "@/modules/catalog/infrastructure/admin-media-repository";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

const mediaSchema = z
  .object({
    altText: z.string().trim().min(3).max(300),
    height: z.coerce.number().int().min(1).max(16_384),
    imageRole: z.enum([
      "cover",
      "gallery",
      "before",
      "after",
      "og",
      "thumbnail",
    ]),
    productId: z.uuid(),
    sortOrder: z.coerce.number().int().min(0).max(10_000),
    storageUrl: z.string().trim().min(1).max(2_000),
    width: z.coerce.number().int().min(1).max(16_384),
  })
  .refine(
    (value) =>
      value.imageRole !== "og" ||
      (value.width === 1200 && value.height === 630),
    { message: "OG image must be 1200x630." },
  );

const imageIdSchema = z.uuid();

function revalidateStoreMedia() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/collections/[collectionSlug]", "page");
  revalidatePath("/products/[productSlug]", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/catalog/media");
}

export async function createProductMediaAction(formData: FormData) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const parsed = mediaSchema.safeParse({
    altText: formData.get("altText"),
    height: formData.get("height"),
    imageRole: formData.get("imageRole"),
    productId: formData.get("productId"),
    sortOrder: formData.get("sortOrder"),
    storageUrl: formData.get("storageUrl"),
    width: formData.get("width"),
  });
  if (!parsed.success) redirect("/admin/catalog/media?notice=invalid");

  const approvedSource = resolvePublicMediaSource(
    parsed.data.storageUrl,
    env.NEXT_PUBLIC_SITE_URL,
    env.NEXT_PUBLIC_MEDIA_ORIGIN,
  );
  if (!approvedSource) {
    redirect("/admin/catalog/media?notice=unapproved_origin");
  }

  const result = await createAdminProductMedia({
    adminUserId: account.id,
    ...parsed.data,
    storageUrl: approvedSource,
  });
  revalidateStoreMedia();
  redirect(`/admin/catalog/media?notice=${result}`);
}

export async function removeProductMediaAction(formData: FormData) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const imageId = imageIdSchema.safeParse(formData.get("imageId"));
  if (!imageId.success) redirect("/admin/catalog/media?notice=invalid");

  const result = await removeAdminProductMedia({
    adminUserId: account.id,
    imageId: imageId.data,
  });
  revalidateStoreMedia();
  redirect(`/admin/catalog/media?notice=${result}`);
}
