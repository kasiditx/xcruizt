import { z } from "zod";

const r2EnvironmentSchema = z
  .object({
    PRIVACY_HASH_SECRET: z.string().min(32),
    R2_ACCESS_KEY_ID: z.string().trim().min(8),
    R2_ACCOUNT_ID: z.string().trim().regex(/^[a-f0-9]{32}$/i),
    R2_BUCKET_PRIVATE: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/),
    R2_SECRET_ACCESS_KEY: z.string().trim().min(16),
  })
  .transform((value) => ({
    accessKeyId: value.R2_ACCESS_KEY_ID,
    accountId: value.R2_ACCOUNT_ID,
    bucketPrivate: value.R2_BUCKET_PRIVATE,
    privacyHashSecret: value.PRIVACY_HASH_SECRET,
    secretAccessKey: value.R2_SECRET_ACCESS_KEY,
  }));

export type R2Environment = z.infer<typeof r2EnvironmentSchema>;

export function parseR2Environment(
  values: Record<string, string | undefined>,
): R2Environment {
  return r2EnvironmentSchema.parse(values);
}

export function getR2Environment(): R2Environment {
  return parseR2Environment({
    PRIVACY_HASH_SECRET: process.env.PRIVACY_HASH_SECRET,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_BUCKET_PRIVATE: process.env.R2_BUCKET_PRIVATE,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  });
}
