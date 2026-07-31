import "server-only";

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
