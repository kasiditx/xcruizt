import { describe, expect, it } from "vitest";

import { hasLinkedDiscordIdentity } from "./discord-link";

describe("Discord identity linking", () => {
  it("recognizes a Discord identity already linked to the current user", () => {
    expect(
      hasLinkedDiscordIdentity([
        { provider: "email" },
        { provider: "discord" },
      ]),
    ).toBe(true);
  });

  it("does not treat other providers as a Discord link", () => {
    expect(
      hasLinkedDiscordIdentity([{ provider: "email" }, { provider: "google" }]),
    ).toBe(false);
  });
});
