import { describe, expect, it, vi } from "vitest";

import { resolveCurrentAccount } from "./current-account";

describe("current account", () => {
  it("returns the database profile for the authenticated user", async () => {
    const findProfileByUserId = vi.fn().mockResolvedValue({
      username: "pilot_07",
    });

    const account = await resolveCurrentAccount({
      getAuthenticatedUserId: vi
        .fn()
        .mockResolvedValue("18f96fd7-a1e8-480d-8e61-67359bc90098"),
      findProfileByUserId,
    });

    expect(account).toEqual({
      status: "ready",
      account: {
        id: "18f96fd7-a1e8-480d-8e61-67359bc90098",
        username: "pilot_07",
      },
    });
    expect(findProfileByUserId).toHaveBeenCalledWith(
      "18f96fd7-a1e8-480d-8e61-67359bc90098",
    );
  });

  it("does not query profiles for an anonymous request", async () => {
    const findProfileByUserId = vi.fn();

    const account = await resolveCurrentAccount({
      getAuthenticatedUserId: vi.fn().mockResolvedValue(null),
      findProfileByUserId,
    });

    expect(account).toEqual({
      status: "anonymous",
    });
    expect(findProfileByUserId).not.toHaveBeenCalled();
  });

  it("requires profile completion for an authenticated user without a profile", async () => {
    const account = await resolveCurrentAccount({
      getAuthenticatedUserId: vi
        .fn()
        .mockResolvedValue("18f96fd7-a1e8-480d-8e61-67359bc90098"),
      findProfileByUserId: vi.fn().mockResolvedValue(null),
    });

    expect(account).toEqual({
      status: "profile_required",
      userId: "18f96fd7-a1e8-480d-8e61-67359bc90098",
    });
  });
});
