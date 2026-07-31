import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  discordRoleMappings,
  discordSyncJobs,
  products,
  profiles,
  skus,
} from "@/db/schema";

export async function listDiscordAdministration(guildId: string) {
  const [mappings, productOptions, skuOptions, jobs] = await Promise.all([
    db
      .select({
        discordRoleId: discordRoleMappings.discordRoleId,
        discordRoleName: discordRoleMappings.discordRoleName,
        id: discordRoleMappings.id,
        isActive: discordRoleMappings.isActive,
        productName: products.name,
        skuName: skus.name,
      })
      .from(discordRoleMappings)
      .leftJoin(products, eq(products.id, discordRoleMappings.productId))
      .leftJoin(skus, eq(skus.id, discordRoleMappings.skuId))
      .where(eq(discordRoleMappings.discordGuildId, guildId))
      .orderBy(desc(discordRoleMappings.createdAt)),
    db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(ne(products.status, "archived"))
      .orderBy(products.name),
    db
      .select({ id: skus.id, name: skus.name, skuCode: skus.skuCode })
      .from(skus)
      .where(ne(skus.status, "archived"))
      .orderBy(skus.name),
    db
      .select({
        attemptCount: discordSyncJobs.attemptCount,
        completedAt: discordSyncJobs.completedAt,
        createdAt: discordSyncJobs.createdAt,
        id: discordSyncJobs.id,
        lastError: discordSyncJobs.lastError,
        status: discordSyncJobs.status,
        userId: discordSyncJobs.userId,
        username: profiles.username,
      })
      .from(discordSyncJobs)
      .innerJoin(profiles, eq(profiles.id, discordSyncJobs.userId))
      .orderBy(desc(discordSyncJobs.createdAt))
      .limit(50),
  ]);

  return { jobs, mappings, productOptions, skuOptions };
}

export async function createDiscordRoleMapping(input: {
  adminUserId: string;
  discordRoleId: string;
  discordRoleName: string;
  guildId: string;
  productId: string | null;
  skuId: string | null;
}): Promise<"created" | "duplicate" | "target_not_found"> {
  return db.transaction(async (transaction) => {
    if (Boolean(input.productId) === Boolean(input.skuId)) {
      return "target_not_found";
    }

    let target: { id: string }[];
    if (input.productId) {
      target = await transaction
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);
    } else if (input.skuId) {
      target = await transaction
        .select({ id: skus.id })
        .from(skus)
        .where(eq(skus.id, input.skuId))
        .limit(1);
    } else {
      return "target_not_found";
    }
    if (!target[0]) return "target_not_found";

    const [created] = await transaction
      .insert(discordRoleMappings)
      .values({
        discordGuildId: input.guildId,
        discordRoleId: input.discordRoleId,
        discordRoleName: input.discordRoleName,
        productId: input.productId,
        skuId: input.skuId,
      })
      .onConflictDoNothing()
      .returning({ id: discordRoleMappings.id });
    if (!created) return "duplicate";

    await transaction.insert(adminAuditLogs).values({
      action: "discord.mapping.create",
      adminUserId: input.adminUserId,
      afterData: {
        discordRoleId: input.discordRoleId,
        discordRoleName: input.discordRoleName,
        guildId: input.guildId,
        productId: input.productId,
        skuId: input.skuId,
      },
      entityId: created.id,
      entityType: "discord_role_mapping",
    });
    return "created";
  });
}

export async function deactivateDiscordRoleMapping(input: {
  adminUserId: string;
  guildId: string;
  mappingId: string;
}): Promise<"deactivated" | "not_found"> {
  return db.transaction(async (transaction) => {
    const [mapping] = await transaction
      .update(discordRoleMappings)
      .set({ isActive: false })
      .where(
        and(
          eq(discordRoleMappings.id, input.mappingId),
          eq(discordRoleMappings.discordGuildId, input.guildId),
          eq(discordRoleMappings.isActive, true),
        ),
      )
      .returning({
        discordRoleId: discordRoleMappings.discordRoleId,
        id: discordRoleMappings.id,
      });
    if (!mapping) return "not_found";

    await transaction.insert(adminAuditLogs).values({
      action: "discord.mapping.deactivate",
      adminUserId: input.adminUserId,
      afterData: { isActive: false },
      beforeData: {
        discordRoleId: mapping.discordRoleId,
        isActive: true,
      },
      entityId: mapping.id,
      entityType: "discord_role_mapping",
    });
    return "deactivated";
  });
}

export async function enqueueAdminDiscordSync(input: {
  adminUserId: string;
  userId: string;
}): Promise<"already_queued" | "not_linked" | "queued"> {
  return db.transaction(async (transaction) => {
    const [profile] = await transaction
      .select({ discordUserId: profiles.discordUserId })
      .from(profiles)
      .where(eq(profiles.id, input.userId))
      .limit(1);
    if (!profile?.discordUserId) return "not_linked";

    const [created] = await transaction
      .insert(discordSyncJobs)
      .values({ action: "full_sync", userId: input.userId })
      .onConflictDoNothing()
      .returning({ id: discordSyncJobs.id });
    if (!created) return "already_queued";

    await transaction.insert(adminAuditLogs).values({
      action: "discord.sync.enqueue",
      adminUserId: input.adminUserId,
      afterData: { action: "full_sync", userId: input.userId },
      entityId: created.id,
      entityType: "discord_sync_job",
    });
    return "queued";
  });
}
