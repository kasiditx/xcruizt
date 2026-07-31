import { describe, expect, it, vi } from "vitest";

import {
  signInWithUsername,
  signUpWithUsername,
  type PasswordAuthDependencies,
} from "./password-auth";

function createDependencies(
  overrides: Partial<PasswordAuthDependencies> = {},
): PasswordAuthDependencies {
  return {
    createPasswordUser: vi.fn().mockResolvedValue({
      failed: false,
      hasSession: true,
      userId: "18f96fd7-a1e8-480d-8e61-67359bc90098",
    }),
    verifyPasswordUser: vi.fn().mockResolvedValue({
      failed: false,
      hasSession: true,
      userId: "18f96fd7-a1e8-480d-8e61-67359bc90098",
    }),
    ensureProfile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("password auth", () => {
  it("creates an immediate session and profile from normalized credentials", async () => {
    const dependencies = createDependencies();

    const result = await signUpWithUsername(
      {
        username: "  Pilot_07 ",
        password: "correct-horse",
        nextPath: "/account/library?from=signup",
      },
      dependencies,
    );

    expect(result).toEqual({
      status: "success",
      redirectPath: "/account/library?from=signup",
    });
    expect(dependencies.createPasswordUser).toHaveBeenCalledWith({
      email: "pilot_07@users.xcruizt.invalid",
      password: "correct-horse",
      username: "pilot_07",
    });
    expect(dependencies.ensureProfile).toHaveBeenCalledWith({
      userId: "18f96fd7-a1e8-480d-8e61-67359bc90098",
      username: "pilot_07",
    });
  });

  it("rejects invalid signup input before calling providers", async () => {
    const dependencies = createDependencies();

    const result = await signUpWithUsername(
      {
        username: "bad-name",
        password: "correct-horse",
        nextPath: "/account/library",
      },
      dependencies,
    );

    expect(result).toEqual({
      status: "error",
      reason: "invalid_input",
    });
    expect(dependencies.createPasswordUser).not.toHaveBeenCalled();
    expect(dependencies.ensureProfile).not.toHaveBeenCalled();
  });

  it("fails closed when signup does not return an immediate session", async () => {
    const dependencies = createDependencies({
      createPasswordUser: vi.fn().mockResolvedValue({
        failed: false,
        hasSession: false,
        userId: "18f96fd7-a1e8-480d-8e61-67359bc90098",
      }),
    });

    const result = await signUpWithUsername(
      {
        username: "pilot_07",
        password: "correct-horse",
        nextPath: "/account/library",
      },
      dependencies,
    );

    expect(result).toEqual({
      status: "error",
      reason: "immediate_session_required",
    });
    expect(dependencies.ensureProfile).not.toHaveBeenCalled();
  });

  it("returns a generic signup failure for provider rejection", async () => {
    const dependencies = createDependencies({
      createPasswordUser: vi.fn().mockResolvedValue({
        failed: true,
        hasSession: false,
        userId: null,
      }),
    });

    const result = await signUpWithUsername(
      {
        username: "pilot_07",
        password: "correct-horse",
        nextPath: "/account/library",
      },
      dependencies,
    );

    expect(result).toEqual({
      status: "error",
      reason: "signup_failed",
    });
  });

  it("signs in and repairs a missing profile without allowing an external redirect", async () => {
    const dependencies = createDependencies();

    const result = await signInWithUsername(
      {
        username: "Pilot_07",
        password: "correct-horse",
        nextPath: "//attacker.example/path",
      },
      dependencies,
    );

    expect(result).toEqual({
      status: "success",
      redirectPath: "/account/library",
    });
    expect(dependencies.verifyPasswordUser).toHaveBeenCalledWith({
      email: "pilot_07@users.xcruizt.invalid",
      password: "correct-horse",
    });
    expect(dependencies.ensureProfile).toHaveBeenCalledWith({
      userId: "18f96fd7-a1e8-480d-8e61-67359bc90098",
      username: "pilot_07",
    });
  });

  it("returns one generic reason for invalid login credentials", async () => {
    const dependencies = createDependencies({
      verifyPasswordUser: vi.fn().mockResolvedValue({
        failed: true,
        hasSession: false,
        userId: null,
      }),
    });

    const result = await signInWithUsername(
      {
        username: "pilot_07",
        password: "wrong-password",
        nextPath: "/account/library",
      },
      dependencies,
    );

    expect(result).toEqual({
      status: "error",
      reason: "invalid_credentials",
    });
    expect(dependencies.ensureProfile).not.toHaveBeenCalled();
  });
});
