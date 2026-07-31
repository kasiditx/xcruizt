import { describe, expect, it } from "vitest";

import {
  parseDatabaseMigrationEnvironment,
  parseDatabaseRuntimeEnvironment,
} from "./database";

describe("parseDatabaseRuntimeEnvironment", () => {
  it("accepts a PostgreSQL runtime URL", () => {
    expect(
      parseDatabaseRuntimeEnvironment({
        DATABASE_URL:
          "postgresql://user:password@pooler.example.com:6543/postgres",
      }),
    ).toEqual({
      DATABASE_URL:
        "postgresql://user:password@pooler.example.com:6543/postgres",
    });
  });

  it("rejects a missing runtime URL", () => {
    expect(() => parseDatabaseRuntimeEnvironment({})).toThrow("DATABASE_URL");
  });

  it("rejects a non-PostgreSQL runtime URL", () => {
    expect(() =>
      parseDatabaseRuntimeEnvironment({
        DATABASE_URL: "https://example.com/database",
      }),
    ).toThrow("PostgreSQL");
  });
});

describe("parseDatabaseMigrationEnvironment", () => {
  it("accepts a separate PostgreSQL migration URL", () => {
    expect(
      parseDatabaseMigrationEnvironment({
        DATABASE_DIRECT_URL:
          "postgresql://user:password@db.example.com:5432/postgres",
      }),
    ).toEqual({
      DATABASE_DIRECT_URL:
        "postgresql://user:password@db.example.com:5432/postgres",
    });
  });

  it("does not fall back to DATABASE_URL", () => {
    expect(() =>
      parseDatabaseMigrationEnvironment({
        DATABASE_URL:
          "postgresql://user:password@pooler.example.com:6543/postgres",
      }),
    ).toThrow("DATABASE_DIRECT_URL");
  });
});
