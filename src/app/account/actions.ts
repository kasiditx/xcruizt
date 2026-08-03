"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { env } from "@/lib/env/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildAuthCallbackUrl } from "@/modules/identity/application/magic-link";
import {
  getDiscordConnectionForUser,
  requestDiscordFullSyncForUser,
  syncDiscordIdentityForAuthenticatedUser,
} from "@/modules/identity/infrastructure/discord-profile";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

async function requireReadyAccount(nextPath: string) {
  const resolution = await getCurrentAccountResolution();

  if (resolution.status === "anonymous") {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (resolution.status === "profile_required") {
    redirect(
      `/auth/complete-profile?next=${encodeURIComponent(nextPath)}`,
    );
  }

  return resolution.account;
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({
    scope: "local",
  });

  if (error) {
    throw new Error("Unable to sign out.");
  }

  redirect("/auth/login");
}

export async function linkDiscordIdentity() {
  await requireReadyAccount("/account/discord");

  const supabase = await createSupabaseServerClient();
  const syncResult = await syncDiscordIdentityForAuthenticatedUser(supabase);
  if (syncResult === "synced") {
    redirect(
      "/account/discord?notice=already_linked",
    );
  }

  const redirectTo = buildAuthCallbackUrl(
    env.NEXT_PUBLIC_SITE_URL,
    "/account/discord?notice=linked",
  );
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "discord",
    options: {
      redirectTo,
      scopes: "identify email",
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    let notice = "link_failed";
    if (error?.code === "identity_already_exists") {
      notice = "identity_conflict";
    } else if (error?.code === "manual_linking_disabled") {
      notice = "manual_linking_disabled";
    }
    redirect(`/account/discord?notice=${notice}`);
  }

  redirect(data.url);
}

export async function requestDiscordResync() {
  const account = await requireReadyAccount("/account/discord");
  const { connection } = await getDiscordConnectionForUser(account.id);

  if (!connection?.discordUserId) {
    redirect("/account/discord?notice=not_linked");
  }

  const result = await requestDiscordFullSyncForUser(account.id);
  revalidatePath("/account/discord");
  redirect(`/account/discord?notice=${result}`);
}
