import { z } from "zod";

const snowflakeSchema = z
  .string()
  .trim()
  .regex(/^\d{5,25}$/, "Expected a Discord snowflake.");

const discordOAuthEnvironmentSchema = z
  .object({
    DISCORD_CLIENT_ID: snowflakeSchema,
    DISCORD_CLIENT_SECRET: z.string().trim().min(16).max(512),
  })
  .transform((value) => ({
    clientId: value.DISCORD_CLIENT_ID,
    clientSecret: value.DISCORD_CLIENT_SECRET,
  }));

const discordBotEnvironmentSchema = z
  .object({
    DISCORD_BOT_TOKEN: z.string().trim().min(32).max(512),
    DISCORD_GUILD_ID: snowflakeSchema,
  })
  .transform((value) => ({
    botToken: value.DISCORD_BOT_TOKEN,
    guildId: value.DISCORD_GUILD_ID,
  }));

const discordGuildEnvironmentSchema = z
  .object({ DISCORD_GUILD_ID: snowflakeSchema })
  .transform((value) => ({ guildId: value.DISCORD_GUILD_ID }));

export type DiscordOAuthEnvironment = z.infer<
  typeof discordOAuthEnvironmentSchema
>;
export type DiscordBotEnvironment = z.infer<
  typeof discordBotEnvironmentSchema
>;
export type DiscordGuildEnvironment = z.infer<
  typeof discordGuildEnvironmentSchema
>;

export function parseDiscordOAuthEnvironment(
  values: Record<string, string | undefined>,
): DiscordOAuthEnvironment {
  return discordOAuthEnvironmentSchema.parse(values);
}

export function parseDiscordBotEnvironment(
  values: Record<string, string | undefined>,
): DiscordBotEnvironment {
  return discordBotEnvironmentSchema.parse(values);
}

export function parseDiscordGuildEnvironment(
  values: Record<string, string | undefined>,
): DiscordGuildEnvironment {
  return discordGuildEnvironmentSchema.parse(values);
}

export function getDiscordBotEnvironment(): DiscordBotEnvironment {
  return parseDiscordBotEnvironment({
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
  });
}

export function getDiscordGuildEnvironment(): DiscordGuildEnvironment {
  return parseDiscordGuildEnvironment({
    DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
  });
}
