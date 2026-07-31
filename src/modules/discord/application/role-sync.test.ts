import { describe, expect, it } from "vitest";

import {
  getDiscordRetryDelayMs,
  resolveDiscordRoleChanges,
} from "./role-sync";

describe("resolveDiscordRoleChanges", () => {
  it("adds desired missing roles and removes only managed stale roles", () => {
    expect(
      resolveDiscordRoleChanges({
        currentRoleIds: ["community", "managed-old", "managed-kept"],
        desiredRoleIds: ["managed-kept", "managed-new"],
        managedRoleIds: ["managed-old", "managed-kept", "managed-new"],
      }),
    ).toEqual({
      add: ["managed-new"],
      remove: ["managed-old"],
    });
  });

  it("deduplicates mappings and never removes an unrelated role", () => {
    expect(
      resolveDiscordRoleChanges({
        currentRoleIds: ["community", "community"],
        desiredRoleIds: [],
        managedRoleIds: ["owned-by-xcruizt"],
      }),
    ).toEqual({ add: [], remove: [] });
  });
});

describe("getDiscordRetryDelayMs", () => {
  it("uses bounded exponential backoff", () => {
    expect([1, 2, 3, 4, 5, 10].map(getDiscordRetryDelayMs)).toEqual([
      30_000,
      60_000,
      120_000,
      240_000,
      480_000,
      900_000,
    ]);
  });
});
