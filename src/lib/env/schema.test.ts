import { describe, expect, it } from "vitest";

import { parseAppEnvironment } from "./schema";

describe("parseAppEnvironment", () => {
  it("uses safe local defaults", () => {
    expect(parseAppEnvironment({})).toEqual({
      APP_ENV: "local",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      LOG_LEVEL: "info",
    });
  });

  it("accepts an HTTPS production site URL", () => {
    expect(
      parseAppEnvironment({
        APP_ENV: "production",
        NEXT_PUBLIC_MEDIA_ORIGIN: "https://media.xcruizt.example",
        NEXT_PUBLIC_SITE_URL: "https://xcruizt.example",
        LOG_LEVEL: "warn",
      }),
    ).toEqual({
      APP_ENV: "production",
      NEXT_PUBLIC_MEDIA_ORIGIN: "https://media.xcruizt.example",
      NEXT_PUBLIC_SITE_URL: "https://xcruizt.example",
      LOG_LEVEL: "warn",
    });
  });

  it("rejects an insecure production media origin", () => {
    expect(() =>
      parseAppEnvironment({
        APP_ENV: "production",
        NEXT_PUBLIC_MEDIA_ORIGIN: "http://media.xcruizt.example",
        NEXT_PUBLIC_SITE_URL: "https://xcruizt.example",
      }),
    ).toThrow("Production media origin must use HTTPS.");
  });

  it("rejects an insecure production site URL", () => {
    expect(() =>
      parseAppEnvironment({
        APP_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "http://xcruizt.example",
      }),
    ).toThrow("Production site URL must use HTTPS.");
  });
});
