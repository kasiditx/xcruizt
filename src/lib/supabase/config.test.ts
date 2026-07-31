import { describe, expect, it } from "vitest";

import { parseSupabasePublicEnvironment } from "./config";

describe("parseSupabasePublicEnvironment", () => {
  it("parses a hosted Supabase project configuration", () => {
    expect(
      parseSupabasePublicEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toEqual({
      url: "https://project-ref.supabase.co",
      publishableKey: "sb_publishable_example",
    });
  });

  it("allows HTTP only for local Supabase development", () => {
    expect(
      parseSupabasePublicEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-anon-key",
      }),
    ).toEqual({
      url: "http://127.0.0.1:54321",
      publishableKey: "local-anon-key",
    });
  });

  it("rejects an insecure hosted project URL", () => {
    expect(() =>
      parseSupabasePublicEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "http://project-ref.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toThrow("Hosted Supabase URL must use HTTPS.");
  });

  it("rejects a missing publishable key", () => {
    expect(() =>
      parseSupabasePublicEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      }),
    ).toThrow();
  });
});
