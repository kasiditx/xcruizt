import "server-only";

import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { SupabaseClient } from "@supabase/supabase-js";

import { db } from "@/db/client";
import { discordSyncJobs, profiles } from "@/db/schema";
import { parseDiscordIdentity } from "../application/discord-identity";

export async function syncDiscordIdentityForAuthenticatedUser(
  supabase: SupabaseClient,
): Promise<"no_discord_identity" | "profile_missing" | "synced"> {
  const [{ data: userData, error: userError }, identitiesResult] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getUserIdentities(),
    ]);
  if (userError || !userData.user || identitiesResult.error) {
    return "no_discord_identity";
  }

  const parsed = identitiesResult.data.identities
    .map((identity) => {
      const runtimeIdentity = identity as unknown as Record<
        string,
        unknown
      >;
      const providerIdCandidates = [
        runtimeIdentity.provider_id,
        identity.identity_id,
        identity.identity_data?.provider_id,
        identity.identity_data?.sub,
      ];
      const providerId = providerIdCandidates.find(
        (value): value is string => typeof value === "string",
      );

      return parseDiscordIdentity({
        identity_data: identity.identity_data,
        provider: identity.provider,
        provider_id: providerId ?? "",
      });
    })
    .find((identity) => identity !== null);
  if (!parsed) return "no_discord_identity";

  return db.transaction(async (transaction) => {
    const [updated] = await transaction
      .update(profiles)
      .set({
        discordAvatarUrl: parsed.avatarUrl,
        discordUserId: parsed.userId,
        discordUsername: parsed.username,
        emailSnapshot: parsed.email,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, userData.user.id))
      .returning({ id: profiles.id });
    if (!updated) return "profile_missing";

    await transaction
      .insert(discordSyncJobs)
      .values({
        action: "full_sync",
        userId: userData.user.id,
      })
      .onConflictDoNothing();

    return "synced";
  });
}

export async function getDiscordConnectionForUser(userId: string) {
  const [profile, jobs] = await Promise.all([
    db
      .select({
        avatarUrl: profiles.discordAvatarUrl,
        discordUserId: profiles.discordUserId,
        username: profiles.discordUsername,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1),
    db
      .select({
        attemptCount: discordSyncJobs.attemptCount,
        completedAt: discordSyncJobs.completedAt,
        lastError: discordSyncJobs.lastError,
        status: discordSyncJobs.status,
      })
      .from(discordSyncJobs)
      .where(eq(discordSyncJobs.userId, userId))
      .orderBy(desc(discordSyncJobs.createdAt))
      .limit(1),
  ]);

  return {
    connection: profile[0] ?? null,
    latestJob: jobs[0] ?? null,
  };
}

export async function enqueueDiscordFullSync(
  userId: string,
): Promise<"already_queued" | "queued"> {
  const [created] = await db
    .insert(discordSyncJobs)
    .values({
      action: "full_sync",
      userId,
    })
    .onConflictDoNothing()
    .returning({ id: discordSyncJobs.id });

  return created ? "queued" : "already_queued";
}

export const CUSTOMER_DISCORD_SYNC_WINDOW_SECONDS = 10 * 60;
const CUSTOMER_SYNC_WINDOW_MS =
  CUSTOMER_DISCORD_SYNC_WINDOW_SECONDS * 1_000;
const CUSTOMER_SYNC_LIMIT = 3;

export async function requestDiscordFullSyncForUser(
  userId: string,
): Promise<
  | "already_queued"
  | "customer_inactive"
  | "not_linked"
  | "queued"
  | "rate_limited"
> {
  const [profile] = await db
    .select({
      customerStatus: profiles.customerStatus,
      discordUserId: profiles.discordUserId,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (!profile?.discordUserId) return "not_linked";
  if (profile.customerStatus !== "active") return "customer_inactive";

  const [recentRequests] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(discordSyncJobs)
    .where(
      and(
        eq(discordSyncJobs.userId, userId),
        gte(
          discordSyncJobs.createdAt,
          new Date(Date.now() - CUSTOMER_SYNC_WINDOW_MS),
        ),
      ),
    );
  if ((recentRequests?.count ?? 0) >= CUSTOMER_SYNC_LIMIT) {
    return "rate_limited";
  }

  return enqueueDiscordFullSync(userId);
}
