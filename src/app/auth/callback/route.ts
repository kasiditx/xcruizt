import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveSafeAuthRedirect } from "@/modules/identity/application/auth-redirect";

const AUTH_ERROR_PATH = "/auth/error";

function createAuthErrorResponse(reason: string) {
  const errorUrl = new URL(AUTH_ERROR_PATH, env.NEXT_PUBLIC_SITE_URL);
  errorUrl.searchParams.set("reason", reason);

  return NextResponse.redirect(errorUrl);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return createAuthErrorResponse("missing_code");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return createAuthErrorResponse("session_exchange_failed");
  }

  const redirectPath = resolveSafeAuthRedirect(
    request.nextUrl.searchParams.get("next"),
  );
  const profileCompletionUrl = new URL(
    "/auth/complete-profile",
    env.NEXT_PUBLIC_SITE_URL,
  );
  profileCompletionUrl.searchParams.set("next", redirectPath);

  return NextResponse.redirect(profileCompletionUrl);
}
