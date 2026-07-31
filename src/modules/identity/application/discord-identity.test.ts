import { describe, expect, it } from "vitest";

import { parseDiscordIdentity } from "./discord-identity";

describe("parseDiscordIdentity", () => {
  it("extracts bounded Discord identity fields", () => {
    expect(
      parseDiscordIdentity({
        identity_data: {
          avatar_url: "https://cdn.discordapp.com/avatars/123/avatar.png",
          email: "user@example.com",
          full_name: "xCruizt User",
        },
        provider: "discord",
        provider_id: "123456789012345678",
      }),
    ).toEqual({
      avatarUrl: "https://cdn.discordapp.com/avatars/123/avatar.png",
      email: "user@example.com",
      userId: "123456789012345678",
      username: "xCruizt User",
    });
  });

  it("does not persist synthetic email or unsafe avatar URLs", () => {
    expect(
      parseDiscordIdentity({
        identity_data: {
          avatar_url: "javascript:alert(1)",
          email: "user@users.xcruizt.invalid",
        },
        provider: "discord",
        provider_id: "123456789012345678",
      }),
    ).toEqual({
      avatarUrl: null,
      email: null,
      userId: "123456789012345678",
      username: null,
    });
  });

  it("rejects non-Discord and malformed provider IDs", () => {
    expect(
      parseDiscordIdentity({
        provider: "google",
        provider_id: "123456789012345678",
      }),
    ).toBeNull();
    expect(
      parseDiscordIdentity({
        provider: "discord",
        provider_id: "not-a-snowflake",
      }),
    ).toBeNull();
  });
});
