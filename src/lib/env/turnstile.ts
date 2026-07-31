import { z } from "zod";

const siteKeySchema = z.string().trim().min(20).max(128);
const secretKeySchema = z.string().trim().min(20).max(256);

const turnstileEnvironmentSchema = z
  .object({
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: siteKeySchema,
    TURNSTILE_SECRET_KEY: secretKeySchema,
  })
  .transform((value) => ({
    secretKey: value.TURNSTILE_SECRET_KEY,
    siteKey: value.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  }));

export type TurnstileEnvironment = z.infer<
  typeof turnstileEnvironmentSchema
>;

export function parseTurnstileEnvironment(
  values: Record<string, string | undefined>,
): TurnstileEnvironment {
  return turnstileEnvironmentSchema.parse(values);
}

export function getTurnstileEnvironment(): TurnstileEnvironment {
  return parseTurnstileEnvironment({
    NEXT_PUBLIC_TURNSTILE_SITE_KEY:
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  });
}

export function getTurnstileSiteKey(): string | null {
  const value = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return value && siteKeySchema.safeParse(value).success ? value : null;
}
