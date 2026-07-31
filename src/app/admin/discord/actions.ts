"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDiscordGuildEnvironment } from "@/lib/env/discord";
import {
  createDiscordRoleMapping,
  deactivateDiscordRoleMapping,
  enqueueAdminDiscordSync,
} from "@/modules/administration/infrastructure/discord-admin-repository";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

const mappingSchema = z
  .object({
    discordRoleId: z.string().trim().regex(/^\d{5,25}$/),
    discordRoleName: z.string().trim().min(1).max(100),
    productId: z.union([z.literal(""), z.uuid()]),
    skuId: z.union([z.literal(""), z.uuid()]),
  })
  .refine(
    (value) => Boolean(value.productId) !== Boolean(value.skuId),
    { message: "Select exactly one source." },
  );

const mappingIdSchema = z.uuid();
const userIdSchema = z.uuid();

function getGuildId(): string | null {
  try {
    return getDiscordGuildEnvironment().guildId;
  } catch {
    return null;
  }
}

export async function createDiscordMappingAction(formData: FormData) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeDiscordMapping,
  );
  const parsed = mappingSchema.safeParse({
    discordRoleId: formData.get("discordRoleId"),
    discordRoleName: formData.get("discordRoleName"),
    productId: formData.get("productId"),
    skuId: formData.get("skuId"),
  });
  if (!parsed.success) redirect("/admin/discord?notice=invalid");

  const guildId = getGuildId();
  if (!guildId) redirect("/admin/discord?notice=not_configured");

  const result = await createDiscordRoleMapping({
    adminUserId: account.id,
    discordRoleId: parsed.data.discordRoleId,
    discordRoleName: parsed.data.discordRoleName,
    guildId,
    productId: parsed.data.productId || null,
    skuId: parsed.data.skuId || null,
  });
  revalidatePath("/admin/discord");
  redirect(`/admin/discord?notice=${result}`);
}

export async function deactivateDiscordMappingAction(formData: FormData) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeDiscordMapping,
  );
  const mappingId = mappingIdSchema.safeParse(formData.get("mappingId"));
  if (!mappingId.success) redirect("/admin/discord?notice=invalid");

  const guildId = getGuildId();
  if (!guildId) redirect("/admin/discord?notice=not_configured");

  const result = await deactivateDiscordRoleMapping({
    adminUserId: account.id,
    guildId,
    mappingId: mappingId.data,
  });
  revalidatePath("/admin/discord");
  redirect(`/admin/discord?notice=${result}`);
}

export async function enqueueDiscordSyncAction(formData: FormData) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.manageDiscordSync,
  );
  const userId = userIdSchema.safeParse(formData.get("userId"));
  if (!userId.success) redirect("/admin/discord?notice=invalid");

  const result = await enqueueAdminDiscordSync({
    adminUserId: account.id,
    userId: userId.data,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/discord");
  redirect(`/admin/discord?notice=${result}`);
}
