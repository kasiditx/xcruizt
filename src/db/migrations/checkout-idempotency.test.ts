import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./0005_far_prima.sql", import.meta.url),
  "utf8",
).toLowerCase();

describe("checkout idempotency migration", () => {
  it("adds a unique checkout request identifier to orders", () => {
    expect(migration).toContain(
      'add column "checkout_request_id" uuid',
    );
    expect(migration).toContain(
      'unique("checkout_request_id")',
    );
  });
});
