import { describe, expect, it } from "vitest";

import { inspectReadinessConfiguration } from "./readiness-policy";

const completeEnvironment = {
  DISCORD_BOT_TOKEN: "bot-token-with-enough-characters-1234567890",
  DISCORD_CLIENT_ID: "123456789012345678",
  DISCORD_CLIENT_SECRET: "discord-client-secret-value",
  DISCORD_GUILD_ID: "123456789012345678",
  EMAIL_FROM: "XCRUIZT <store@example.com>",
  EMAIL_REPLY_TO: "support@example.com",
  NEXT_PUBLIC_SENTRY_DSN:
    "https://public@example.ingest.sentry.io/123",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key-value",
  PRIVACY_HASH_SECRET: "p".repeat(32),
  QSTASH_CURRENT_SIGNING_KEY: "current-signing-key-value",
  QSTASH_NEXT_SIGNING_KEY: "next-signing-key-value",
  QSTASH_TOKEN: "qstash-publisher-token-value",
  R2_ACCESS_KEY_ID: "access-key-id",
  R2_ACCOUNT_ID: "a".repeat(32),
  R2_BUCKET_PRIVATE: "xcruizt-private",
  R2_SECRET_ACCESS_KEY: "r2-secret-access-key-value",
  RESEND_API_KEY: "re_example12345678",
  SENTRY_TRACES_SAMPLE_RATE: "0.1",
  STRIPE_SECRET_KEY: "sk_test_example123",
  STRIPE_WEBHOOK_SECRET: "whsec_example123",
  TURNSTILE_SECRET_KEY: "turnstile-secret-key-value",
  UPSTASH_REDIS_REST_TOKEN: "upstash-redis-token-value",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
};

describe("inspectReadinessConfiguration", () => {
  it("allows local development without external providers", () => {
    expect(inspectReadinessConfiguration("local", {})).toEqual({
      blocking: [],
      degraded: [],
    });
  });

  it("accepts a complete production provider configuration", () => {
    expect(
      inspectReadinessConfiguration("production", completeEnvironment),
    ).toEqual({ blocking: [], degraded: [] });
  });

  it("blocks production when required providers are missing", () => {
    const result = inspectReadinessConfiguration("production", {});

    expect(result.blocking).toEqual([
      "qstash",
      "r2",
      "resend",
      "sentry",
      "stripe",
      "supabase",
      "turnstile",
      "upstash",
    ]);
    expect(result.degraded).toEqual(["discord"]);
  });

  it("treats optional Discord as degraded instead of blocking", () => {
    const withoutDiscord = Object.fromEntries(
      Object.entries(completeEnvironment).filter(
        ([key]) => !key.startsWith("DISCORD_"),
      ),
    );

    expect(
      inspectReadinessConfiguration("production", withoutDiscord),
    ).toEqual({ blocking: [], degraded: ["discord"] });
  });

  it("blocks a partially configured provider outside local", () => {
    expect(
      inspectReadinessConfiguration("preview", {
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      }),
    ).toEqual({ blocking: ["upstash"], degraded: [] });
  });
});
