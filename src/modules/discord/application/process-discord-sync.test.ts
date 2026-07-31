import { describe, expect, it, vi } from "vitest";

import { DiscordProviderError } from "./provider-error";
import {
  processNextDiscordSyncJob,
  type ProcessDiscordSyncDependencies,
} from "./process-discord-sync";

function dependencies(): ProcessDiscordSyncDependencies & {
  addRole: ReturnType<typeof vi.fn>;
  claimJob: ReturnType<typeof vi.fn>;
  completeJob: ReturnType<typeof vi.fn>;
  failJob: ReturnType<typeof vi.fn>;
  getContext: ReturnType<typeof vi.fn>;
  getCurrentRoles: ReturnType<typeof vi.fn>;
  removeRole: ReturnType<typeof vi.fn>;
} {
  return {
    addRole: vi.fn<(userId: string, roleId: string) => Promise<void>>(
      async () => undefined,
    ),
    claimJob: vi.fn(async () => ({
      attemptCount: 1,
      id: "job-id",
      userId: "user-id",
    })),
    completeJob: vi.fn(async () => undefined),
    failJob: vi.fn(async () => undefined),
    getContext: vi.fn(async () => ({
      desiredRoleIds: ["role-new", "role-kept"],
      discordUserId: "discord-user",
      managedRoleIds: ["role-old", "role-new", "role-kept"],
    })),
    getCurrentRoles: vi.fn(async () => ["role-old", "role-kept"]),
    removeRole: vi.fn<
      (userId: string, roleId: string) => Promise<void>
    >(async () => undefined),
  };
}

describe("processNextDiscordSyncJob", () => {
  it("applies only the desired managed-role delta", async () => {
    const deps = dependencies();

    await expect(
      processNextDiscordSyncJob(deps),
    ).resolves.toEqual({ added: 1, removed: 1, status: "succeeded" });
    expect(deps.addRole).toHaveBeenCalledWith(
      "discord-user",
      "role-new",
    );
    expect(deps.removeRole).toHaveBeenCalledWith(
      "discord-user",
      "role-old",
    );
    expect(deps.completeJob).toHaveBeenCalledWith("job-id");
    expect(deps.failJob).not.toHaveBeenCalled();
  });

  it("ends a job safely when the identity is no longer available", async () => {
    const deps = dependencies();
    deps.getContext.mockResolvedValue(null);

    await expect(
      processNextDiscordSyncJob(deps),
    ).resolves.toEqual({ retryScheduled: false, status: "failed" });
    expect(deps.failJob).toHaveBeenCalledWith({
      attemptCount: 1,
      errorCode: "identity_or_account_unavailable",
      jobId: "job-id",
      retryable: false,
    });
  });

  it("preserves a retryable provider failure without leaking details", async () => {
    const deps = dependencies();
    deps.getCurrentRoles.mockRejectedValue(
      new DiscordProviderError("rate_limited", true, 45_000),
    );

    await expect(
      processNextDiscordSyncJob(deps),
    ).resolves.toEqual({ retryScheduled: true, status: "failed" });
    expect(deps.failJob).toHaveBeenCalledWith({
      attemptCount: 1,
      errorCode: "rate_limited",
      jobId: "job-id",
      retryAfterMs: 45_000,
      retryable: true,
    });
  });

  it("does nothing when no job is due", async () => {
    const deps = dependencies();
    deps.claimJob.mockResolvedValue(null);

    await expect(
      processNextDiscordSyncJob(deps),
    ).resolves.toEqual({ status: "idle" });
  });
});
