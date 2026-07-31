import "server-only";

import { z } from "zod";

import type { DiscordBotEnvironment } from "@/lib/env/discord";
import { DiscordProviderError } from "../application/provider-error";

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const memberSchema = z.object({
  roles: z.array(z.string().regex(/^\d{5,25}$/)),
});

function parseRetryAfterMs(response: Response): number | undefined {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return undefined;

  const seconds = Number(retryAfter);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;

  return Math.min(15 * 60_000, Math.ceil(seconds * 1_000));
}

async function discordRequest(
  environment: DiscordBotEnvironment,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${DISCORD_API_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        authorization: `Bot ${environment.botToken}`,
        ...init?.headers,
      },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new DiscordProviderError("network_error", true);
  }

  if (response.ok) return response;
  if (response.status === 404) {
    throw new DiscordProviderError("member_not_found", false);
  }
  if (response.status === 401 || response.status === 403) {
    throw new DiscordProviderError("permission_denied", false);
  }
  if (response.status === 429) {
    throw new DiscordProviderError(
      "rate_limited",
      true,
      parseRetryAfterMs(response),
    );
  }
  if (response.status >= 500) {
    throw new DiscordProviderError("server_error", true);
  }

  throw new DiscordProviderError("invalid_response", false);
}

function memberPath(environment: DiscordBotEnvironment, userId: string) {
  return `/guilds/${environment.guildId}/members/${userId}`;
}

export async function getDiscordGuildMemberRoleIds(
  environment: DiscordBotEnvironment,
  userId: string,
): Promise<string[]> {
  const response = await discordRequest(
    environment,
    memberPath(environment, userId),
  );

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new DiscordProviderError("invalid_response", false);
  }

  const parsed = memberSchema.safeParse(body);
  if (!parsed.success) {
    throw new DiscordProviderError("invalid_response", false);
  }

  return parsed.data.roles;
}

export async function addDiscordGuildMemberRole(
  environment: DiscordBotEnvironment,
  userId: string,
  roleId: string,
): Promise<void> {
  await discordRequest(
    environment,
    `${memberPath(environment, userId)}/roles/${roleId}`,
    { method: "PUT" },
  );
}

export async function removeDiscordGuildMemberRole(
  environment: DiscordBotEnvironment,
  userId: string,
  roleId: string,
): Promise<void> {
  await discordRequest(
    environment,
    `${memberPath(environment, userId)}/roles/${roleId}`,
    { method: "DELETE" },
  );
}
