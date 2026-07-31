import { z } from "zod";

const reason = z.string().trim().min(8).max(500);
const grantSchema = z.object({
  productId: z.uuid(),
  reason,
  userId: z.uuid(),
});
const revokeSchema = z.object({
  entitlementId: z.uuid(),
  reason,
});

function parse<T>(
  schema: z.ZodType<T>,
  input: unknown,
):
  | { fieldErrors: Partial<Record<string, string[]>>; ok: false }
  | { ok: true; value: T } {
  const result = schema.safeParse(input);
  return result.success
    ? { ok: true, value: result.data }
    : {
        fieldErrors: result.error.flatten().fieldErrors,
        ok: false,
      };
}

export function parseManualEntitlementGrant(input: unknown) {
  return parse(grantSchema, input);
}

export function parseManualEntitlementRevoke(input: unknown) {
  return parse(revokeSchema, input);
}
