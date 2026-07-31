import { describe, expect, it } from "vitest";

import { parseUpstashRedisEnvironment } from "./upstash";

describe("Upstash Redis environment", () => {
  it("accepts a complete HTTPS REST configuration", () => {
    expect(
      parseUpstashRedisEnvironment({
        UPSTASH_REDIS_REST_TOKEN: "redis-rest-token-value",
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      }),
    ).toEqual({
      token: "redis-rest-token-value",
      url: "https://example.upstash.io",
    });
  });

  it("rejects partial or insecure configuration", () => {
    expect(() =>
      parseUpstashRedisEnvironment({
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      }),
    ).toThrow();
    expect(() =>
      parseUpstashRedisEnvironment({
        UPSTASH_REDIS_REST_TOKEN: "redis-rest-token-value",
        UPSTASH_REDIS_REST_URL: "http://example.upstash.io",
      }),
    ).toThrow();
  });
});
