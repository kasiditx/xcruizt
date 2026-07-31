import "server-only";

import { redirect } from "next/navigation";

import { env } from "@/lib/env/server";
import { logServerError } from "@/lib/observability/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isAdminMfaRequired,
  resolveAdminMfaNextPath,
} from "../application/admin-mfa-policy";

export async function getAdminMfaState() {
  const supabase = await createSupabaseServerClient();
  const [claims, factors] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.auth.mfa.listFactors(),
  ]);

  if (claims.error || !claims.data || factors.error) {
    throw new Error("Unable to resolve Supabase MFA state.");
  }

  const currentLevel = claims.data.claims.aal;

  return {
    currentLevel:
      typeof currentLevel === "string" ? currentLevel : null,
    hasUnverifiedTotp: factors.data.all.some(
      (factor) =>
        factor.factor_type === "totp" &&
        factor.status === "unverified",
    ),
    verifiedTotpFactorId: factors.data.totp[0]?.id ?? null,
  };
}

export async function requireAdminMfa(
  nextPath: string = "/admin",
): Promise<void> {
  if (env.APP_ENV === "local") return;

  let state: Awaited<ReturnType<typeof getAdminMfaState>>;
  try {
    state = await getAdminMfaState();
  } catch {
    logServerError("admin.mfa_state_unavailable", {
      route: nextPath,
    });
    redirect("/admin/mfa?notice=unavailable");
  }

  if (isAdminMfaRequired(env.APP_ENV, state.currentLevel)) {
    const safeNext = resolveAdminMfaNextPath(nextPath);
    redirect(`/admin/mfa?next=${encodeURIComponent(safeNext)}`);
  }
}

export async function hasRequiredAdminMfa(): Promise<boolean> {
  if (env.APP_ENV === "local") return true;

  try {
    const state = await getAdminMfaState();
    return !isAdminMfaRequired(env.APP_ENV, state.currentLevel);
  } catch {
    logServerError("admin.mfa_state_unavailable", {
      route: "admin-api",
    });
    return false;
  }
}
