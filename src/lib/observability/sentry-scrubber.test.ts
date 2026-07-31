import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";

import { sanitizeSentryEvent } from "./sentry-scrubber";

describe("sanitizeSentryEvent", () => {
  it("removes request secrets, PII and unsafe diagnostic fields", () => {
    const event: ErrorEvent = {
      type: undefined,
      breadcrumbs: [{ data: { token: "secret" }, message: "checkout" }],
      extra: { payload: "private" },
      request: {
        cookies: { session: "secret" },
        data: { password: "secret" },
        headers: { authorization: "Bearer secret" },
        query_string: "session_id=secret",
        url: "https://xcruizt.example/checkout?session_id=secret#result",
      },
      tags: {
        email: "customer@example.com",
        provider: "stripe",
      },
      user: {
        email: "customer@example.com",
        id: "user-id",
        ip_address: "203.0.113.1",
      },
    };

    expect(sanitizeSentryEvent(event)).toMatchObject({
      breadcrumbs: [{ data: undefined, message: "checkout" }],
      extra: undefined,
      request: {
        cookies: undefined,
        data: undefined,
        headers: undefined,
        query_string: undefined,
        url: "https://xcruizt.example/checkout",
      },
      tags: { provider: "stripe" },
      user: { id: "user-id" },
    });
  });
});
