import { describe, expect, it, vi } from "vitest";

import {
  completeUsernameProfile,
  type CompleteProfileDependencies,
} from "./complete-profile";

function createDependencies(
  overrides: Partial<CompleteProfileDependencies> = {},
): CompleteProfileDependencies {
  return {
    getAuthenticatedUserId: vi
      .fn()
      .mockResolvedValue("18f96fd7-a1e8-480d-8e61-67359bc90098"),
    saveProfile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("complete username profile", () => {
  it("saves a normalized username for the authenticated user", async () => {
    const dependencies = createDependencies();

    const result = await completeUsernameProfile(
      {
        username: "  Pilot_07 ",
        nextPath: "/account/library?from=discord",
      },
      dependencies,
    );

    expect(result).toEqual({
      status: "success",
      redirectPath: "/account/library?from=discord",
    });
    expect(dependencies.saveProfile).toHaveBeenCalledWith({
      userId: "18f96fd7-a1e8-480d-8e61-67359bc90098",
      username: "pilot_07",
    });
  });

  it("rejects invalid usernames before checking the session", async () => {
    const dependencies = createDependencies();

    const result = await completeUsernameProfile(
      {
        username: "bad-name",
        nextPath: "/account/library",
      },
      dependencies,
    );

    expect(result).toEqual({
      status: "error",
      reason: "invalid_username",
    });
    expect(dependencies.getAuthenticatedUserId).not.toHaveBeenCalled();
    expect(dependencies.saveProfile).not.toHaveBeenCalled();
  });

  it("rejects anonymous profile completion", async () => {
    const dependencies = createDependencies({
      getAuthenticatedUserId: vi.fn().mockResolvedValue(null),
    });

    const result = await completeUsernameProfile(
      {
        username: "pilot_07",
        nextPath: "//attacker.example",
      },
      dependencies,
    );

    expect(result).toEqual({
      status: "error",
      reason: "authentication_required",
    });
    expect(dependencies.saveProfile).not.toHaveBeenCalled();
  });
});
