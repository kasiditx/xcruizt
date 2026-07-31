import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  discordRoleMappings,
  discordSyncJobs,
  entitlements,
  orderItems,
  profiles,
} from "@/db/schema";
import {
  DISCORD_SYNC_MAX_ATTEMPTS,
  getDiscordRetryDelayMs,
} from "../application/role-sync";
import type {
  ClaimedDiscordSyncJob,
  DiscordRoleSyncContext,
} from "../application/process-discord-sync";

export async function claimDiscordSyncJob(): Promise<ClaimedDiscordSyncJob | null> {
  return db.transaction(async (transaction) => {
    const rows = await transaction.execute<ClaimedDiscordSyncJob>(sql`
      with candidate as (
        select ${discordSyncJobs.id}
        from ${discordSyncJobs}
        where (
          (
            ${discordSyncJobs.status} in ('pending', 'failed')
            and ${discordSyncJobs.completedAt} is null
            and ${discordSyncJobs.availableAt} <= now()
          )
          or (
            ${discordSyncJobs.status} = 'running'
            and ${discordSyncJobs.completedAt} is null
            and ${discordSyncJobs.updatedAt} <= now() - interval '5 minutes'
          )
        )
          and ${discordSyncJobs.attemptCount} < ${DISCORD_SYNC_MAX_ATTEMPTS}
        order by ${discordSyncJobs.availableAt}, ${discordSyncJobs.createdAt}
        for update skip locked
        limit 1
      )
      update ${discordSyncJobs} as job
      set
        status = 'running',
        attempt_count = job.attempt_count + 1,
        last_error = null,
        started_at = now(),
        updated_at = now()
      from candidate
      where job.id = candidate.id
      returning
        job.id,
        job.user_id as "userId",
        job.attempt_count as "attemptCount"
    `);

    return rows[0] ?? null;
  });
}

export async function getDiscordRoleSyncContext(
  userId: string,
  guildId: string,
): Promise<DiscordRoleSyncContext | null> {
  const [profileRows, productRows, skuRows, mappings] =
    await Promise.all([
      db
        .select({
          customerStatus: profiles.customerStatus,
          discordUserId: profiles.discordUserId,
        })
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1),
      db
        .select({ productId: entitlements.productId })
        .from(entitlements)
        .where(
          and(
            eq(entitlements.userId, userId),
            eq(entitlements.status, "active"),
          ),
        ),
      db
        .selectDistinct({ skuId: orderItems.skuId })
        .from(entitlements)
        .innerJoin(
          orderItems,
          eq(orderItems.orderId, entitlements.sourceOrderId),
        )
        .where(
          and(
            eq(entitlements.userId, userId),
            eq(entitlements.status, "active"),
          ),
        ),
      db
        .select({
          discordRoleId: discordRoleMappings.discordRoleId,
          isActive: discordRoleMappings.isActive,
          productId: discordRoleMappings.productId,
          skuId: discordRoleMappings.skuId,
        })
        .from(discordRoleMappings)
        .where(eq(discordRoleMappings.discordGuildId, guildId)),
    ]);

  const profile = profileRows[0];
  if (
    !profile?.discordUserId ||
    profile.customerStatus !== "active"
  ) {
    return null;
  }

  const ownedProductIds = new Set(
    productRows.map(({ productId }) => productId),
  );
  const ownedSkuIds = new Set(skuRows.map(({ skuId }) => skuId));
  const desiredRoleIds = mappings
    .filter(
      (mapping) =>
        mapping.isActive &&
        ((mapping.productId !== null &&
          ownedProductIds.has(mapping.productId)) ||
          (mapping.skuId !== null && ownedSkuIds.has(mapping.skuId))),
    )
    .map(({ discordRoleId }) => discordRoleId);

  return {
    desiredRoleIds: [...new Set(desiredRoleIds)],
    discordUserId: profile.discordUserId,
    managedRoleIds: [
      ...new Set(mappings.map(({ discordRoleId }) => discordRoleId)),
    ],
  };
}

export async function completeDiscordSyncJob(jobId: string): Promise<void> {
  const now = new Date();
  await db
    .update(discordSyncJobs)
    .set({
      completedAt: now,
      lastError: null,
      status: "succeeded",
      updatedAt: now,
    })
    .where(
      and(
        eq(discordSyncJobs.id, jobId),
        eq(discordSyncJobs.status, "running"),
      ),
    );
}

export async function failDiscordSyncJob(input: {
  attemptCount: number;
  errorCode: string;
  jobId: string;
  retryAfterMs?: number;
  retryable: boolean;
}): Promise<void> {
  const now = new Date();
  const exhausted = input.attemptCount >= DISCORD_SYNC_MAX_ATTEMPTS;
  const terminal = !input.retryable || exhausted;
  const retryDelayMs = Math.max(
    input.retryAfterMs ?? 0,
    getDiscordRetryDelayMs(input.attemptCount),
  );

  await db
    .update(discordSyncJobs)
    .set({
      availableAt: terminal
        ? now
        : new Date(now.getTime() + retryDelayMs),
      completedAt: terminal ? now : null,
      lastError: input.errorCode.slice(0, 128),
      status: "failed",
      updatedAt: now,
    })
    .where(
      and(
        eq(discordSyncJobs.id, input.jobId),
        inArray(discordSyncJobs.status, ["running", "failed"]),
      ),
    );
}
