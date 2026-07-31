import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email();

export function parseMagicLinkEmail(value: unknown): string {
  return emailSchema.parse(value);
}

export function buildAuthCallbackUrl(
  siteUrl: string,
  redirectPath: string,
): string {
  const callbackUrl = new URL("/auth/callback", siteUrl);
  callbackUrl.searchParams.set("next", redirectPath);

  return callbackUrl.toString();
}
