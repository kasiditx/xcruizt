import { describe, expect, it } from "vitest";

import {
  parseDiscordBotEnvironment,
  parseDiscordGuildEnvironment,
  parseDiscordOAuthEnvironment,
} from "./discord";

describe("Discord environment", () => {
  it("parses server-only OAuth and Bot settings", () => {
    expect(
      parseDiscordOAuthEnvironment({
        DISCORD_CLIENT_ID: "123456789012345678",
        DISCORD_CLIENT_SECRET: "client-secret-value",
      }),
    ).toEqual({
      clientId: "123456789012345678",
      clientSecret: "client-secret-value",
    });
    expect(
      parseDiscordBotEnvironment({
        DISCORD_BOT_TOKEN: "x".repeat(32),
        DISCORD_GUILD_ID: "987654321098765432",
      }),
    ).toEqual({
      botToken: "x".repeat(32),
      guildId: "987654321098765432",
    });
    expect(
      parseDiscordGuildEnvironment({
        DISCORD_GUILD_ID: "987654321098765432",
      }),
    ).toEqual({ guildId: "987654321098765432" });
  });

  it.each([
    {},
    {
      DISCORD_BOT_TOKEN: "short",
      DISCORD_GUILD_ID: "not-a-snowflake",
    },
  ])("rejects incomplete or malformed Bot settings", (values) => {
    expect(() => parseDiscordBotEnvironment(values)).toThrow();
  });

  it("rejects secrets exposed through a public environment name", () => {
    expect(() =>
      parseDiscordOAuthEnvironment({
        NEXT_PUBLIC_DISCORD_CLIENT_ID: "123456789012345678",
        NEXT_PUBLIC_DISCORD_CLIENT_SECRET: "client-secret-value",
      }),
    ).toThrow();
  });
});
