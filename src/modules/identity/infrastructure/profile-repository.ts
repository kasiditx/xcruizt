import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { profiles } from "@/db/schema";

type EnsureProfileInput = {
  userId: string;
  username: string;
};

export async function ensureProfile({
  userId,
  username,
}: EnsureProfileInput): Promise<void> {
  await db
    .insert(profiles)
    .values({
      id: userId,
      username,
    })
    .onConflictDoNothing({
      target: profiles.id,
    });
}

export async function getCustomerProfile(userId: string) {
  const [profile] = await db
    .select({
      createdAt: profiles.createdAt,
      customerStatus: profiles.customerStatus,
      discordUsername: profiles.discordUsername,
      displayName: profiles.displayName,
      emailSnapshot: profiles.emailSnapshot,
      username: profiles.username,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return profile ?? null;
}

export async function updateCustomerDisplayName(
  userId: string,
  displayName: string | null,
): Promise<boolean> {
  const [updated] = await db
    .update(profiles)
    .set({ displayName, updatedAt: new Date() })
    .where(eq(profiles.id, userId))
    .returning({ id: profiles.id });

  return Boolean(updated);
}
