import { z } from "zod";

const emailAddressSchema = z.email().max(254);
const fromAddressSchema = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .refine((value) => {
    const bracketed = value.match(/<([^<>]+)>$/);
    return emailAddressSchema.safeParse(bracketed?.[1] ?? value).success;
  }, "Expected an email address or Name <email> format.");

const resendEnvironmentSchema = z
  .object({
    EMAIL_FROM: fromAddressSchema,
    EMAIL_REPLY_TO: emailAddressSchema,
    RESEND_API_KEY: z
      .string()
      .trim()
      .regex(/^re_[A-Za-z0-9_-]{8,}$/),
  })
  .transform((value) => ({
    apiKey: value.RESEND_API_KEY,
    from: value.EMAIL_FROM,
    replyTo: value.EMAIL_REPLY_TO,
  }));

export type ResendEnvironment = z.infer<typeof resendEnvironmentSchema>;

export function parseResendEnvironment(
  values: Record<string, string | undefined>,
): ResendEnvironment {
  return resendEnvironmentSchema.parse(values);
}

export function getResendEnvironment(): ResendEnvironment {
  return parseResendEnvironment({
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  });
}
