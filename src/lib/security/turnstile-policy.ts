import { z } from "zod";

export type TurnstileAction = "signin" | "signup";

export const turnstileTokenSchema = z.string().trim().min(1).max(2_048);

const turnstileResponseSchema = z.object({
  action: z.string().optional(),
  hostname: z.string().optional(),
  success: z.boolean(),
});

export function evaluateTurnstileResponse(
  input: unknown,
  expected: { action: TurnstileAction; hostname: string },
): boolean {
  const result = turnstileResponseSchema.safeParse(input);
  return Boolean(
    result.success &&
      result.data.success &&
      result.data.action === expected.action &&
      result.data.hostname === expected.hostname,
  );
}
