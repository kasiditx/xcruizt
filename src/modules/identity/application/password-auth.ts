import { ZodError } from "zod";

import { resolveSafeAuthRedirect } from "./auth-redirect";
import {
  parseUsernameCredentials,
  toInternalAuthEmail,
  type UsernameCredentials,
} from "./username-credentials";

export type PasswordAuthProviderResult = {
  failed: boolean;
  hasSession: boolean;
  userId: string | null;
};

export type PasswordAuthDependencies = {
  createPasswordUser(input: {
    email: string;
    password: string;
    username: string;
  }): Promise<PasswordAuthProviderResult>;
  verifyPasswordUser(input: {
    email: string;
    password: string;
  }): Promise<PasswordAuthProviderResult>;
  ensureProfile(input: {
    userId: string;
    username: string;
  }): Promise<void>;
};

type SignUpDependencies = Pick<
  PasswordAuthDependencies,
  "createPasswordUser" | "ensureProfile"
>;

type SignInDependencies = Pick<
  PasswordAuthDependencies,
  "ensureProfile" | "verifyPasswordUser"
>;

type PasswordAuthInput = {
  username: unknown;
  password: unknown;
  nextPath: string | null | undefined;
};

export type PasswordAuthResult =
  | {
      status: "success";
      redirectPath: string;
    }
  | {
      status: "error";
      reason:
        | "immediate_session_required"
        | "invalid_credentials"
        | "invalid_input"
        | "signup_failed";
    };

function parseCredentials(
  input: PasswordAuthInput,
): UsernameCredentials | null {
  try {
    return parseUsernameCredentials(input);
  } catch (error) {
    if (error instanceof ZodError) {
      return null;
    }

    throw error;
  }
}

export async function signUpWithUsername(
  input: PasswordAuthInput,
  dependencies: SignUpDependencies,
): Promise<PasswordAuthResult> {
  const credentials = parseCredentials(input);

  if (!credentials) {
    return {
      status: "error",
      reason: "invalid_input",
    };
  }

  const authResult = await dependencies.createPasswordUser({
    email: toInternalAuthEmail(credentials.username),
    password: credentials.password,
    username: credentials.username,
  });

  if (authResult.failed || !authResult.userId) {
    return {
      status: "error",
      reason: "signup_failed",
    };
  }

  if (!authResult.hasSession) {
    return {
      status: "error",
      reason: "immediate_session_required",
    };
  }

  await dependencies.ensureProfile({
    userId: authResult.userId,
    username: credentials.username,
  });

  return {
    status: "success",
    redirectPath: resolveSafeAuthRedirect(input.nextPath),
  };
}

export async function signInWithUsername(
  input: PasswordAuthInput,
  dependencies: SignInDependencies,
): Promise<PasswordAuthResult> {
  const credentials = parseCredentials(input);

  if (!credentials) {
    return {
      status: "error",
      reason: "invalid_credentials",
    };
  }

  const authResult = await dependencies.verifyPasswordUser({
    email: toInternalAuthEmail(credentials.username),
    password: credentials.password,
  });

  if (
    authResult.failed ||
    !authResult.hasSession ||
    !authResult.userId
  ) {
    return {
      status: "error",
      reason: "invalid_credentials",
    };
  }

  await dependencies.ensureProfile({
    userId: authResult.userId,
    username: credentials.username,
  });

  return {
    status: "success",
    redirectPath: resolveSafeAuthRedirect(input.nextPath),
  };
}
