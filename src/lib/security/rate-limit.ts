import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { getUpstashRedisEnvironment } from "@/lib/env/upstash";
import { env } from "@/lib/env/server";
import {
  createRateLimitIdentifier,
  evaluateLocalRateLimit,
  rateLimitPolicies,
  type InternalRateLimitScope,
  type RateLimitDecision,
  type RateLimitScope,
} from "./rate-limit-policy";

export type { RateLimitDecision, RateLimitScope } from "./rate-limit-policy";

type LocalBucket = { timestamps: number[] };
const localBuckets = new Map<string, LocalBucket>();
const remoteLimiters = new Map<InternalRateLimitScope, Ratelimit>();

export class RateLimitUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("Distributed rate limit backend is unavailable.", options);
    this.name = "RateLimitUnavailableError";
  }
}

function consumeLocalLimit(
  scope: InternalRateLimitScope,
  identifier: string,
): RateLimitDecision {
  const storageKey = `${scope}:${identifier}`;
  const result = evaluateLocalRateLimit(
    localBuckets.get(storageKey)?.timestamps ?? [],
    rateLimitPolicies[scope],
    Date.now(),
  );
  localBuckets.set(storageKey, { timestamps: result.timestamps });

  return result;
}

function getRemoteLimiter(
  scope: InternalRateLimitScope,
  redis: Redis,
): Ratelimit {
  const existing = remoteLimiters.get(scope);
  if (existing) return existing;

  const limiter = new Ratelimit({
    analytics: false,
    limiter: Ratelimit.slidingWindow(
      rateLimitPolicies[scope].limit,
      rateLimitPolicies[scope].window,
    ),
    prefix: `xcruizt:ratelimit:${scope}`,
    redis,
  });
  remoteLimiters.set(scope, limiter);
  return limiter;
}

async function consumeLimit(
  scope: InternalRateLimitScope,
  parts: Array<string | null | undefined>,
): Promise<RateLimitDecision> {
  const hasRedisConfiguration = Boolean(
    process.env.UPSTASH_REDIS_REST_URL ||
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );

  if (!hasRedisConfiguration && env.APP_ENV === "local") {
    return consumeLocalLimit(
      scope,
      createRateLimitIdentifier(scope, parts),
    );
  }

  try {
    const environment = getUpstashRedisEnvironment();
    const identifier = createRateLimitIdentifier(
      scope,
      parts,
      environment.token,
    );
    const redis = new Redis(environment);
    const result = await getRemoteLimiter(scope, redis).limit(identifier);
    await result.pending;

    return {
      allowed: result.success,
      limit: result.limit,
      remaining: result.remaining,
      retryAfterSeconds: result.success
        ? 0
        : Math.max(
            1,
            Math.ceil((result.reset - Date.now()) / 1_000),
          ),
    };
  } catch (error) {
    throw new RateLimitUnavailableError({ cause: error });
  }
}

export async function consumeSecurityRateLimit(
  scope: RateLimitScope,
  identifierParts: Array<string | null | undefined>,
): Promise<RateLimitDecision> {
  return consumeSecurityRateLimits([
    { identifierParts, scope },
  ]);
}

export async function consumeSecurityRateLimits(
  requests: Array<{
    identifierParts: Array<string | null | undefined>;
    scope: RateLimitScope;
  }>,
): Promise<RateLimitDecision> {
  const emergencyLimit = await consumeLimit("global", ["all"]);
  if (!emergencyLimit.allowed) return emergencyLimit;

  let decision = emergencyLimit;
  for (const request of requests) {
    decision = await consumeLimit(
      request.scope,
      request.identifierParts,
    );
    if (!decision.allowed) return decision;
  }

  return decision;
}
