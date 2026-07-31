import { describe, expect, it } from "vitest";

import { parseR2Environment } from "./r2";

describe("parseR2Environment", () => {
  it("accepts a private R2 configuration", () => {
    expect(
      parseR2Environment({
        PRIVACY_HASH_SECRET: "p".repeat(32),
        R2_ACCESS_KEY_ID: "access-key-id",
        R2_ACCOUNT_ID: "a".repeat(32),
        R2_BUCKET_PRIVATE: "xcruizt-private",
        R2_SECRET_ACCESS_KEY: "secret-access-key",
      }),
    ).toEqual({
      accessKeyId: "access-key-id",
      accountId: "a".repeat(32),
      bucketPrivate: "xcruizt-private",
      privacyHashSecret: "p".repeat(32),
      secretAccessKey: "secret-access-key",
    });
  });

  it("rejects malformed or incomplete credentials", () => {
    expect(() =>
      parseR2Environment({
        PRIVACY_HASH_SECRET: "short",
        R2_ACCOUNT_ID: "not-an-account-id",
      }),
    ).toThrow();
  });
});
