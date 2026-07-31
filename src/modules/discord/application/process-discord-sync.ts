import { DiscordProviderError } from "./provider-error";
import { resolveDiscordRoleChanges } from "./role-sync";

export type ClaimedDiscordSyncJob = {
  attemptCount: number;
  id: string;
  userId: string;
};

export type DiscordRoleSyncContext = {
  desiredRoleIds: string[];
  discordUserId: string;
  managedRoleIds: string[];
};

export type ProcessDiscordSyncDependencies = {
  addRole(userId: string, roleId: string): Promise<void>;
  claimJob(): Promise<ClaimedDiscordSyncJob | null>;
  completeJob(jobId: string): Promise<void>;
  failJob(input: {
    attemptCount: number;
    errorCode: string;
    jobId: string;
    retryAfterMs?: number;
    retryable: boolean;
  }): Promise<void>;
  getContext(userId: string): Promise<DiscordRoleSyncContext | null>;
  getCurrentRoles(userId: string): Promise<string[]>;
  removeRole(userId: string, roleId: string): Promise<void>;
};

export type ProcessDiscordSyncResult =
  | { status: "idle" }
  | { retryScheduled: boolean; status: "failed" }
  | { added: number; removed: number; status: "succeeded" };

export async function processNextDiscordSyncJob(
  dependencies: ProcessDiscordSyncDependencies,
): Promise<ProcessDiscordSyncResult> {
  const job = await dependencies.claimJob();
  if (!job) return { status: "idle" };

  try {
    const context = await dependencies.getContext(job.userId);
    if (!context) {
      await dependencies.failJob({
        attemptCount: job.attemptCount,
        errorCode: "identity_or_account_unavailable",
        jobId: job.id,
        retryable: false,
      });
      return { retryScheduled: false, status: "failed" };
    }

    const currentRoleIds = await dependencies.getCurrentRoles(
      context.discordUserId,
    );
    const changes = resolveDiscordRoleChanges({
      currentRoleIds,
      desiredRoleIds: context.desiredRoleIds,
      managedRoleIds: context.managedRoleIds,
    });

    for (const roleId of changes.add) {
      await dependencies.addRole(context.discordUserId, roleId);
    }
    for (const roleId of changes.remove) {
      await dependencies.removeRole(context.discordUserId, roleId);
    }

    await dependencies.completeJob(job.id);
    return {
      added: changes.add.length,
      removed: changes.remove.length,
      status: "succeeded",
    };
  } catch (error) {
    const providerError =
      error instanceof DiscordProviderError ? error : null;
    const retryable = providerError?.retryable ?? true;
    await dependencies.failJob({
      attemptCount: job.attemptCount,
      errorCode: providerError?.code ?? "provider_unavailable",
      jobId: job.id,
      retryAfterMs: providerError?.retryAfterMs,
      retryable,
    });

    return { retryScheduled: retryable, status: "failed" };
  }
}
