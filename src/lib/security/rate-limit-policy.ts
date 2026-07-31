import { createHash, createHmac } from "node:crypto";

import type { Duration } from "@upstash/ratelimit";

export type RateLimitScope =
  | "admin_refund"
  | "auth_signin"
  | "auth_signup"
  | "checkout_quote"
  | "checkout_session"
  | "download_ip"
  | "download_user";

export type InternalRateLimitScope = "global" | RateLimitScope;
export type RateLimitPolicy = {
  limit: number;
  window: Duration;
  windowMs: number;
};

export const rateLimitPolicies: Record<
  InternalRateLimitScope,
  RateLimitPolicy
> = {
  admin_refund: { limit: 10, window: "1 h", windowMs: 60 * 60_000 },
  auth_signin: { limit: 5, window: "10 m", windowMs: 10 * 60_000 },
  auth_signup: { limit: 3, window: "10 m", windowMs: 10 * 60_000 },
  checkout_quote: { limit: 10, window: "1 m", windowMs: 60_000 },
  checkout_session: { limit: 10, window: "1 m", windowMs: 60_000 },
  download_ip: { limit: 30, window: "1 h", windowMs: 60 * 60_000 },
  download_user: { limit: 10, window: "1 h", windowMs: 60 * 60_000 },
  global: { limit: 1_000, window: "1 m", windowMs: 60_000 },
};

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export function createRateLimitIdentifier(
  scope: InternalRateLimitScope,
  parts: Array<string | null | undefined>,
  secret?: string,
): string {
  const normalized = parts
    .map((part) => part?.trim().toLowerCase() || "unknown")
    .join("\0");
  const input = `${scope}\0${normalized}`;

  return secret
    ? createHmac("sha256", secret).update(input).digest("hex")
    : createHash("sha256").update(input).digest("hex");
}

export function evaluateLocalRateLimit(
  timestamps: number[],
  policy: RateLimitPolicy,
  now: number,
): RateLimitDecision & { timestamps: number[] } {
  const activeTimestamps = timestamps.filter(
    (timestamp) => timestamp > now - policy.windowMs,
  );
  const allowed = activeTimestamps.length < policy.limit;
  if (allowed) activeTimestamps.push(now);

  const resetAt = activeTimestamps[0]
    ? activeTimestamps[0] + policy.windowMs
    : now + policy.windowMs;

  return {
    allowed,
    limit: policy.limit,
    remaining: Math.max(
      0,
      policy.limit - activeTimestamps.length,
    ),
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((resetAt - now) / 1_000)),
    timestamps: activeTimestamps,
  };
}
