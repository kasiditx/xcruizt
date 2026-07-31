import { z } from "zod";

const upstashRedisEnvironmentSchema = z
  .object({
    UPSTASH_REDIS_REST_TOKEN: z.string().trim().min(16).max(4_096),
    UPSTASH_REDIS_REST_URL: z.string().url().refine(
      (value) => new URL(value).protocol === "https:",
      "Upstash Redis REST URL must use HTTPS.",
    ),
  })
  .transform((value) => ({
    token: value.UPSTASH_REDIS_REST_TOKEN,
    url: value.UPSTASH_REDIS_REST_URL,
  }));

export type UpstashRedisEnvironment = z.infer<
  typeof upstashRedisEnvironmentSchema
>;

export function parseUpstashRedisEnvironment(
  values: Record<string, string | undefined>,
): UpstashRedisEnvironment {
  return upstashRedisEnvironmentSchema.parse(values);
}

export function getUpstashRedisEnvironment(): UpstashRedisEnvironment {
  return parseUpstashRedisEnvironment({
    UPSTASH_REDIS_REST_TOKEN:
      process.env.UPSTASH_REDIS_REST_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  });
}
