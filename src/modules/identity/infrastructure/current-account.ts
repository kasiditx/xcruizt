import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  resolveCurrentAccount,
  type CurrentAccountResolution,
} from "@/modules/identity/application/current-account";

export async function getCurrentAccountResolution(): Promise<CurrentAccountResolution> {
  const supabase = await createSupabaseServerClient();

  return resolveCurrentAccount({
    async getAuthenticatedUserId() {
      const { data, error } = await supabase.auth.getClaims();

      if (error || !data || typeof data.claims.sub !== "string") {
        return null;
      }

      return data.claims.sub;
    },
    async findProfileByUserId(userId) {
      const [profile] = await db
        .select({
          username: profiles.username,
        })
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1);

      return profile ?? null;
    },
  });
}
