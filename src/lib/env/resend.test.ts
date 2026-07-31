import { describe, expect, it } from "vitest";

import { parseResendEnvironment } from "./resend";

describe("Resend environment", () => {
  it("parses a branded sender and reply-to address", () => {
    expect(
      parseResendEnvironment({
        EMAIL_FROM: "XCRUIZT <orders@mail.xcruizt.com>",
        EMAIL_REPLY_TO: "support@xcruizt.com",
        RESEND_API_KEY: "re_example_key",
      }),
    ).toEqual({
      apiKey: "re_example_key",
      from: "XCRUIZT <orders@mail.xcruizt.com>",
      replyTo: "support@xcruizt.com",
    });
  });

  it.each([
    {
      EMAIL_FROM: "not-an-email",
      EMAIL_REPLY_TO: "support@xcruizt.com",
      RESEND_API_KEY: "re_example_key",
    },
    {
      EMAIL_FROM: "orders@mail.xcruizt.com",
      EMAIL_REPLY_TO: "not-an-email",
      RESEND_API_KEY: "re_example_key",
    },
    {
      EMAIL_FROM: "orders@mail.xcruizt.com",
      EMAIL_REPLY_TO: "support@xcruizt.com",
      RESEND_API_KEY: "wrong-prefix",
    },
  ])("rejects malformed email provider settings", (values) => {
    expect(() => parseResendEnvironment(values)).toThrow();
  });
});
