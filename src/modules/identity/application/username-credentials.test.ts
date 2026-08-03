import { describe, expect, it } from "vitest";

import {
  parseUsername,
  parseUsernameCredentials,
  passwordsMatch,
  toInternalAuthEmail,
} from "./username-credentials";

describe("username credentials", () => {
  it("matches password confirmation without transforming either value", () => {
    expect(passwordsMatch("correct-horse", "correct-horse")).toBe(true);
    expect(passwordsMatch("correct-horse", "Correct-horse")).toBe(false);
    expect(passwordsMatch("", "")).toBe(false);
  });

  it("normalizes a valid username to lowercase", () => {
    expect(
      parseUsernameCredentials({
        username: "  Pilot_07  ",
        password: "correct-horse",
      }),
    ).toEqual({
      username: "pilot_07",
      password: "correct-horse",
    });
  });

  it("normalizes a standalone username for OAuth profile completion", () => {
    expect(parseUsername("  Pilot_07  ")).toBe("pilot_07");
  });

  it.each([
    ["ab", "shorter than three characters"],
    ["a".repeat(25), "longer than twenty-four characters"],
    ["pilot-name", "contains a hyphen"],
    ["นักบิน", "contains non-ASCII characters"],
    ["pilot name", "contains a space"],
  ])("rejects username %j when it %s", (username) => {
    expect(() =>
      parseUsernameCredentials({
        username,
        password: "correct-horse",
      }),
    ).toThrow();
  });

  it.each(["admin", "administrator", "root", "support", "system", "xcruizt"])(
    "rejects reserved username %s",
    (username) => {
      expect(() =>
        parseUsernameCredentials({
          username,
          password: "correct-horse",
        }),
      ).toThrow();
    },
  );

  it("rejects passwords shorter than eight characters", () => {
    expect(() =>
      parseUsernameCredentials({
        username: "pilot_07",
        password: "1234567",
      }),
    ).toThrow();
  });

  it("rejects passwords longer than seventy-two characters", () => {
    expect(() =>
      parseUsernameCredentials({
        username: "pilot_07",
        password: "a".repeat(73),
      }),
    ).toThrow();
  });

  it("derives a deterministic non-deliverable Supabase identifier", () => {
    expect(toInternalAuthEmail("pilot_07")).toBe(
      "pilot_07@users.xcruizt.invalid",
    );
  });
});
