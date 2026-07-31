export type CompleteProfileDependencies = {
  getAuthenticatedUserId(): Promise<string | null>;
  saveProfile(input: {
    userId: string;
    username: string;
  }): Promise<void>;
};

type CompleteProfileInput = {
  username: unknown;
  nextPath: string | null | undefined;
};

export type CompleteProfileResult =
  | {
      status: "success";
      redirectPath: string;
    }
  | {
      status: "error";
      reason: "authentication_required" | "invalid_username";
    };

export async function completeUsernameProfile(
  input: CompleteProfileInput,
  dependencies: CompleteProfileDependencies,
): Promise<CompleteProfileResult> {
  let username: string;

  try {
    username = parseUsername(input.username);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        status: "error",
        reason: "invalid_username",
      };
    }

    throw error;
  }

  const userId = await dependencies.getAuthenticatedUserId();

  if (!userId) {
    return {
      status: "error",
      reason: "authentication_required",
    };
  }

  await dependencies.saveProfile({
    userId,
    username,
  });

  return {
    status: "success",
    redirectPath: resolveSafeAuthRedirect(input.nextPath),
  };
}
import { ZodError } from "zod";

import { resolveSafeAuthRedirect } from "./auth-redirect";
import { parseUsername } from "./username-credentials";
