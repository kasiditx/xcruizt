import { z } from "zod";

const displayNameSchema = z
  .string()
  .trim()
  .max(80)
  .regex(/^[^\u0000-\u001f\u007f<>]*$/u)
  .transform((value) => value || null);

const profileInputSchema = z.object({ displayName: displayNameSchema });

export type ProfileInput = z.infer<typeof profileInputSchema>;

export function parseProfileInput(input: unknown):
  | { ok: false }
  | { ok: true; value: ProfileInput } {
  const result = profileInputSchema.safeParse(input);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false };
}
