import { z } from "zod";

const secretSchema = z.string().trim().min(16).max(2_048);

const qstashPublisherEnvironmentSchema = z
  .object({
    QSTASH_TOKEN: secretSchema,
  })
  .transform((value) => ({
    token: value.QSTASH_TOKEN,
  }));

const qstashReceiverEnvironmentSchema = z
  .object({
    QSTASH_CURRENT_SIGNING_KEY: secretSchema,
    QSTASH_NEXT_SIGNING_KEY: secretSchema,
  })
  .transform((value) => ({
    currentSigningKey: value.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: value.QSTASH_NEXT_SIGNING_KEY,
  }));

export type QStashPublisherEnvironment = z.infer<
  typeof qstashPublisherEnvironmentSchema
>;
export type QStashReceiverEnvironment = z.infer<
  typeof qstashReceiverEnvironmentSchema
>;

export function parseQStashPublisherEnvironment(
  values: Record<string, string | undefined>,
): QStashPublisherEnvironment {
  return qstashPublisherEnvironmentSchema.parse(values);
}

export function parseQStashReceiverEnvironment(
  values: Record<string, string | undefined>,
): QStashReceiverEnvironment {
  return qstashReceiverEnvironmentSchema.parse(values);
}

export function getQStashPublisherEnvironment(): QStashPublisherEnvironment {
  return parseQStashPublisherEnvironment({
    QSTASH_TOKEN: process.env.QSTASH_TOKEN,
  });
}

export function getQStashReceiverEnvironment(): QStashReceiverEnvironment {
  return parseQStashReceiverEnvironment({
    QSTASH_CURRENT_SIGNING_KEY:
      process.env.QSTASH_CURRENT_SIGNING_KEY,
    QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
  });
}
