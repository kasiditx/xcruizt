import { describe, expect, it } from "vitest";

import { databaseClientOptions } from "./client-options";

describe("databaseClientOptions", () => {
  it("disables prepared statements for Transaction Pooler mode", () => {
    expect(databaseClientOptions.prepare).toBe(false);
  });
});
