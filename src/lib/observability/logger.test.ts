import { describe, expect, it } from "vitest";

import { redactLogContext } from "./logger-policy";

describe("redactLogContext", () => {
  it("removes secrets and personal data while preserving operational tags", () => {
    expect(
      redactLogContext({
        accessToken: "secret",
        customerEmail: "customer@example.com",
        orderId: "order-id",
        provider: "stripe",
        remoteIp: "203.0.113.1",
        requestId: "request-id",
        signedUrl: "https://private.example/file?signature=secret",
        username: "customer",
      }),
    ).toEqual({
      orderId: "order-id",
      provider: "stripe",
      requestId: "request-id",
    });
  });
});
