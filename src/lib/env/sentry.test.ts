import { describe, expect, it } from "vitest";

import { parseSentryEnvironment } from "./sentry";

describe("parseSentryEnvironment", () => {
  it("parses an HTTPS DSN and sample rate", () => {
    expect(
      parseSentryEnvironment({
        NEXT_PUBLIC_SENTRY_DSN:
          "https://public@example.ingest.sentry.io/123",
        SENTRY_TRACES_SAMPLE_RATE: "0.25",
      }),
    ).toEqual({
      dsn: "https://public@example.ingest.sentry.io/123",
      tracesSampleRate: 0.25,
    });
  });

  it("defaults the trace sample rate", () => {
    expect(
      parseSentryEnvironment({
        NEXT_PUBLIC_SENTRY_DSN:
          "https://public@example.ingest.sentry.io/123",
      }).tracesSampleRate,
    ).toBe(0.1);
  });

  it("rejects insecure DSNs and out-of-range sample rates", () => {
    expect(() =>
      parseSentryEnvironment({
        NEXT_PUBLIC_SENTRY_DSN:
          "http://public@example.ingest.sentry.io/123",
      }),
    ).toThrow("Sentry DSN must use HTTPS.");

    expect(() =>
      parseSentryEnvironment({
        NEXT_PUBLIC_SENTRY_DSN:
          "https://public@example.ingest.sentry.io/123",
        SENTRY_TRACES_SAMPLE_RATE: "2",
      }),
    ).toThrow();
  });
});
