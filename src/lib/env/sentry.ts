import { z } from "zod";

const sentryEnvironmentSchema = z
  .object({
    NEXT_PUBLIC_SENTRY_DSN: z
      .string()
      .url()
      .refine(
        (value) => new URL(value).protocol === "https:",
        "Sentry DSN must use HTTPS.",
      ),
    SENTRY_TRACES_SAMPLE_RATE: z.coerce
      .number()
      .min(0)
      .max(1)
      .default(0.1),
  })
  .transform((value) => ({
    dsn: value.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: value.SENTRY_TRACES_SAMPLE_RATE,
  }));

export type SentryEnvironment = z.infer<typeof sentryEnvironmentSchema>;

export function parseSentryEnvironment(
  values: Record<string, string | undefined>,
): SentryEnvironment {
  return sentryEnvironmentSchema.parse(values);
}

export function getOptionalSentryEnvironment(): SentryEnvironment | null {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) return null;

  return parseSentryEnvironment({
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
  });
}
