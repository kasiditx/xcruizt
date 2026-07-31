export type DiscordRoleChanges = {
  add: string[];
  remove: string[];
};

export function resolveDiscordRoleChanges(input: {
  currentRoleIds: readonly string[];
  desiredRoleIds: readonly string[];
  managedRoleIds: readonly string[];
}): DiscordRoleChanges {
  const current = new Set(input.currentRoleIds);
  const desired = new Set(input.desiredRoleIds);
  const managed = new Set(input.managedRoleIds);

  return {
    add: [...desired]
      .filter((roleId) => !current.has(roleId))
      .toSorted(),
    remove: [...current]
      .filter(
        (roleId) => managed.has(roleId) && !desired.has(roleId),
      )
      .toSorted(),
  };
}

export const DISCORD_SYNC_MAX_ATTEMPTS = 5;

export function getDiscordRetryDelayMs(attemptCount: number): number {
  const normalizedAttempt = Math.max(1, Math.trunc(attemptCount));
  return Math.min(15 * 60_000, 30_000 * 2 ** (normalizedAttempt - 1));
}
