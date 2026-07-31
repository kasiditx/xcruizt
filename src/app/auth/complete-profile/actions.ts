"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  completeUsernameProfile,
  type CompleteProfileResult,
} from "@/modules/identity/application/complete-profile";
import { resolveSafeAuthRedirect } from "@/modules/identity/application/auth-redirect";
import { ensureProfile } from "@/modules/identity/infrastructure/profile-repository";

export type CompleteProfileActionState = {
  status: "idle" | "error";
  message: string;
};

export async function completeProfileAction(
  _previousState: CompleteProfileActionState,
  formData: FormData,
): Promise<CompleteProfileActionState> {
  let result: CompleteProfileResult;

  try {
    const supabase = await createSupabaseServerClient();

    result = await completeUsernameProfile(
      {
        username: formData.get("username"),
        nextPath: formData.get("next")?.toString(),
      },
      {
        async getAuthenticatedUserId() {
          const { data, error } = await supabase.auth.getClaims();

          if (
            error ||
            !data ||
            typeof data.claims.sub !== "string"
          ) {
            return null;
          }

          return data.claims.sub;
        },
        saveProfile: ensureProfile,
      },
    );
  } catch {
    console.error("Unexpected profile completion failure.");

    return {
      status: "error",
      message: "Username นี้ใช้งานไม่ได้ กรุณาเปลี่ยนชื่อหรือลองใหม่",
    };
  }

  if (result.status === "success") {
    redirect(result.redirectPath);
  }

  if (result.reason === "authentication_required") {
    const nextPath = resolveSafeAuthRedirect(
      formData.get("next")?.toString(),
    );
    redirect(
      `/auth/login?next=${encodeURIComponent(
        `/auth/complete-profile?next=${encodeURIComponent(nextPath)}`,
      )}`,
    );
  }

  return {
    status: "error",
    message: "Username ใช้ได้เฉพาะ a-z, 0-9, _ จำนวน 3–24 ตัว",
  };
}
