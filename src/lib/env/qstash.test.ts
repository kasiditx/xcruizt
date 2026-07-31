import { describe, expect, it } from "vitest";

import {
  parseQStashPublisherEnvironment,
  parseQStashReceiverEnvironment,
} from "./qstash";

describe("QStash environment", () => {
  it("parses publisher and rotating receiver credentials", () => {
    expect(
      parseQStashPublisherEnvironment({
        QSTASH_TOKEN: "publisher-token-value",
      }),
    ).toEqual({ token: "publisher-token-value" });
    expect(
      parseQStashReceiverEnvironment({
        QSTASH_CURRENT_SIGNING_KEY: "current-signing-key",
        QSTASH_NEXT_SIGNING_KEY: "next-signing-key",
      }),
    ).toEqual({
      currentSigningKey: "current-signing-key",
      nextSigningKey: "next-signing-key",
    });
  });

  it("requires both signing keys for safe rotation", () => {
    expect(() =>
      parseQStashReceiverEnvironment({
        QSTASH_CURRENT_SIGNING_KEY: "current-signing-key",
      }),
    ).toThrow();
  });
});
