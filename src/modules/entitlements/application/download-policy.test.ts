import { describe, expect, it } from "vitest";

import {
  buildSafeContentDisposition,
  evaluateDownloadRateLimit,
} from "./download-policy";

describe("evaluateDownloadRateLimit", () => {
  it("allows a request below both limits", () => {
    expect(
      evaluateDownloadRateLimit({
        ipAttempts: 4,
        ipLimit: 25,
        userAttempts: 4,
        userLimit: 10,
      }),
    ).toEqual({ allowed: true });
  });

  it("blocks a user that reached the user limit", () => {
    expect(
      evaluateDownloadRateLimit({
        ipAttempts: 4,
        ipLimit: 25,
        userAttempts: 10,
        userLimit: 10,
      }),
    ).toEqual({ allowed: false, reason: "user_limit" });
  });

  it("blocks an IP that reached the IP limit", () => {
    expect(
      evaluateDownloadRateLimit({
        ipAttempts: 25,
        ipLimit: 25,
        userAttempts: 4,
        userLimit: 10,
      }),
    ).toEqual({ allowed: false, reason: "ip_limit" });
  });
});

describe("buildSafeContentDisposition", () => {
  it("creates an RFC 5987 filename without header injection", () => {
    expect(
      buildSafeContentDisposition('preset\r\n"x.zip'),
    ).toBe(
      "attachment; filename=\"presetx.zip\"; filename*=UTF-8''preset%22x.zip",
    );
  });

  it("uses a fallback for an empty filename", () => {
    expect(buildSafeContentDisposition("\n\r")).toBe(
      "attachment; filename=\"xcruizt-download\"; filename*=UTF-8''xcruizt-download",
    );
  });
});
