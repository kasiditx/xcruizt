import { z } from "zod";

const stripeEnvironmentSchema = z
  .object({
    STRIPE_SECRET_KEY: z
      .string()
      .trim()
      .regex(/^sk_(?:test|live)_[A-Za-z0-9_]+$/),
    STRIPE_WEBHOOK_SECRET: z
      .string()
      .trim()
      .regex(/^whsec_[A-Za-z0-9_]+$/),
  })
  .transform((value) => ({
    secretKey: value.STRIPE_SECRET_KEY,
    webhookSecret: value.STRIPE_WEBHOOK_SECRET,
  }));

export type StripeEnvironment = z.infer<typeof stripeEnvironmentSchema>;

export function parseStripeEnvironment(
  values: Record<string, string | undefined>,
): StripeEnvironment {
  return stripeEnvironmentSchema.parse(values);
}

export function getStripeEnvironment(): StripeEnvironment {
  return parseStripeEnvironment({
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  });
}
