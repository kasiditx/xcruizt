"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@/lib/env/server";
import { extractClientIp } from "@/lib/http/client-fingerprint";
import {
  logServerError,
  logServerWarning,
} from "@/lib/observability/logger";
import {
  consumeSecurityRateLimit,
  type RateLimitScope,
} from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveSafeAuthRedirect } from "@/modules/identity/application/auth-redirect";
import {
  signInWithUsername,
  signUpWithUsername,
  type PasswordAuthResult,
} from "@/modules/identity/application/password-auth";
import {
  buildAuthCallbackUrl,
} from "@/modules/identity/application/magic-link";
import { ensureProfile } from "@/modules/identity/infrastructure/profile-repository";

export type PasswordAuthActionState = {
  status: "idle" | "error";
  message: string;
};

const AUTH_ERROR_MESSAGES: Record<
  Extract<PasswordAuthResult, { status: "error" }>["reason"],
  string
> = {
  immediate_session_required:
    "ระบบยังบังคับยืนยันอีเมลอยู่ กรุณาแจ้งผู้ดูแล XCRUIZT",
  invalid_credentials: "Username หรือ Password ไม่ถูกต้อง",
  invalid_input:
    "Username ใช้ได้เฉพาะ a-z, 0-9, _ จำนวน 3–24 ตัว และ Password 8–72 ตัว",
  signup_failed: "สมัครบัญชีไม่สำเร็จ กรุณาเปลี่ยน Username หรือลองใหม่",
};

function toActionError(
  result: Extract<PasswordAuthResult, { status: "error" }>,
): PasswordAuthActionState {
  return {
    status: "error",
    message: AUTH_ERROR_MESSAGES[result.reason],
  };
}

function unexpectedAuthError(operation: "signin" | "signup") {
  logServerError("auth.password_failed", {
    operation,
  });

  return {
    status: "error" as const,
    message: "ระบบเข้าสู่ระบบขัดข้องชั่วคราว กรุณาลองใหม่",
  };
}

async function enforcePasswordAuthRateLimit(
  scope: Extract<RateLimitScope, "auth_signin" | "auth_signup">,
  formData: FormData,
  clientIp: string | null,
): Promise<PasswordAuthActionState | null> {
  const username = formData.get("username")?.toString() ?? "unknown";

  try {
    const decision = await consumeSecurityRateLimit(scope, [
      clientIp,
      username,
    ]);
    if (decision.allowed) return null;

    logServerWarning("auth.rate_limited", { scope });
    return {
      status: "error",
      message: "ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
    };
  } catch {
    logServerError("auth.rate_limit_unavailable", { scope });
    return {
      status: "error",
      message: "ระบบป้องกันการเข้าสู่ระบบขัดข้องชั่วคราว กรุณาลองใหม่",
    };
  }
}

async function enforceTurnstile(
  action: "signin" | "signup",
  formData: FormData,
  clientIp: string | null,
): Promise<PasswordAuthActionState | null> {
  const result = await verifyTurnstile({
    action,
    remoteIp: clientIp,
    token: formData.get("cf-turnstile-response"),
  });
  if (result === "verified") return null;

  if (result === "invalid") {
    logServerWarning("auth.turnstile_rejected", { action });
    return {
      status: "error",
      message: "ยืนยันความปลอดภัยไม่สำเร็จ กรุณาลองใหม่",
    };
  }

  return {
    status: "error",
    message: "ระบบยืนยันความปลอดภัยขัดข้องชั่วคราว กรุณาลองใหม่",
  };
}

export async function signUpWithPassword(
  _previousState: PasswordAuthActionState,
  formData: FormData,
): Promise<PasswordAuthActionState> {
  const clientIp = extractClientIp(await headers());
  const rateLimitError = await enforcePasswordAuthRateLimit(
    "auth_signup",
    formData,
    clientIp,
  );
  if (rateLimitError) return rateLimitError;
  const turnstileError = await enforceTurnstile(
    "signup",
    formData,
    clientIp,
  );
  if (turnstileError) return turnstileError;

  let result: PasswordAuthResult;
  try {
    const supabase = await createSupabaseServerClient();

    result = await signUpWithUsername(
      {
        username: formData.get("username"),
        password: formData.get("password"),
        nextPath: formData.get("next")?.toString(),
      },
      {
        async createPasswordUser({ email, password, username }) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username,
              },
            },
          });

          return {
            failed: Boolean(error),
            hasSession: Boolean(data.session),
            userId: data.user?.id ?? null,
          };
        },
        ensureProfile,
      },
    );
  } catch {
    return unexpectedAuthError("signup");
  }

  if (result.status === "error") {
    return toActionError(result);
  }

  redirect(result.redirectPath);
}

export async function signInWithPassword(
  _previousState: PasswordAuthActionState,
  formData: FormData,
): Promise<PasswordAuthActionState> {
  const clientIp = extractClientIp(await headers());
  const rateLimitError = await enforcePasswordAuthRateLimit(
    "auth_signin",
    formData,
    clientIp,
  );
  if (rateLimitError) return rateLimitError;
  const turnstileError = await enforceTurnstile(
    "signin",
    formData,
    clientIp,
  );
  if (turnstileError) return turnstileError;

  let result: PasswordAuthResult;
  try {
    const supabase = await createSupabaseServerClient();

    result = await signInWithUsername(
      {
        username: formData.get("username"),
        password: formData.get("password"),
        nextPath: formData.get("next")?.toString(),
      },
      {
        async verifyPasswordUser({ email, password }) {
          const { data, error } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          return {
            failed: Boolean(error),
            hasSession: Boolean(data.session),
            userId: data.user?.id ?? null,
          };
        },
        ensureProfile,
      },
    );
  } catch {
    return unexpectedAuthError("signin");
  }

  if (result.status === "error") {
    return toActionError(result);
  }

  redirect(result.redirectPath);
}

export async function signInWithDiscord(formData: FormData) {
  const redirectPath = resolveSafeAuthRedirect(
    formData.get("next")?.toString(),
  );
  const redirectTo = buildAuthCallbackUrl(
    env.NEXT_PUBLIC_SITE_URL,
    redirectPath,
  );
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo,
      scopes: "identify email",
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    redirect("/auth/error?reason=oauth_start_failed");
  }

  redirect(data.url);
}
