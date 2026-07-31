import { describe, expect, it } from "vitest";

import { hasExpectedOrigin } from "./origin";

describe("hasExpectedOrigin", () => {
  it("accepts only the configured site origin", () => {
    expect(
      hasExpectedOrigin(
        new Headers({ origin: "https://xcruizt.example" }),
        "https://xcruizt.example/path",
      ),
    ).toBe(true);
  });

  it.each([
    new Headers(),
    new Headers({ origin: "https://attacker.example" }),
    new Headers({ origin: "not-a-url" }),
  ])("rejects missing or unexpected origins", (headers) => {
    expect(
      hasExpectedOrigin(headers, "https://xcruizt.example"),
    ).toBe(false);
  });
});
