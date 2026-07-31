import "server-only";

import type { DiscordBotEnvironment } from "@/lib/env/discord";
import { processNextDiscordSyncJob } from "../application/process-discord-sync";
import {
  addDiscordGuildMemberRole,
  getDiscordGuildMemberRoleIds,
  removeDiscordGuildMemberRole,
} from "./discord-api";
import {
  claimDiscordSyncJob,
  completeDiscordSyncJob,
  failDiscordSyncJob,
  getDiscordRoleSyncContext,
} from "./discord-sync-repository";

export function runNextDiscordSyncJob(
  environment: DiscordBotEnvironment,
) {
  return processNextDiscordSyncJob({
    addRole: (userId, roleId) =>
      addDiscordGuildMemberRole(environment, userId, roleId),
    claimJob: claimDiscordSyncJob,
    completeJob: completeDiscordSyncJob,
    failJob: failDiscordSyncJob,
    getContext: (userId) =>
      getDiscordRoleSyncContext(userId, environment.guildId),
    getCurrentRoles: (userId) =>
      getDiscordGuildMemberRoleIds(environment, userId),
    removeRole: (userId, roleId) =>
      removeDiscordGuildMemberRole(environment, userId, roleId),
  });
}
