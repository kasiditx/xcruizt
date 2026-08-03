import { describe, expect, it } from "vitest";

import {
  parseDiscordIdentity,
  parseDiscordRuntimeIdentity,
} from "./discord-identity";

describe("parseDiscordIdentity", () => {
  it("prefers a valid Discord provider ID over a UUID identity ID", () => {
    expect(
      parseDiscordRuntimeIdentity({
        identity_data: {
          full_name: "z6ixx",
          provider_id: "240367114467147776",
          sub: "240367114467147776",
        },
        identity_id: "d1fe512c-9329-4ade-856f-a0426761b8a9",
        provider: "discord",
      }),
    ).toEqual({
      avatarUrl: null,
      email: null,
      userId: "240367114467147776",
      username: "z6ixx",
    });
  });

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
