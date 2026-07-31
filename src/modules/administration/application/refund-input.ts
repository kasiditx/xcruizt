import { z } from "zod";

const fullRefundSchema = z.object({
  instructionsEmail: z
    .email()
    .max(254)
    .refine((value) => !value.endsWith("@users.xcruizt.invalid")),
  paymentId: z.uuid(),
  reason: z.string().trim().min(8).max(500),
  refundRequestId: z.uuid(),
});

export type FullRefundInput = z.infer<typeof fullRefundSchema>;

export function parseFullRefundInput(input: unknown):
  | {
      fieldErrors: Partial<Record<keyof FullRefundInput, string[]>>;
      ok: false;
    }
  | { ok: true; value: FullRefundInput } {
  const result = fullRefundSchema.safeParse(input);
  return result.success
    ? { ok: true, value: result.data }
    : {
        fieldErrors: result.error.flatten()
          .fieldErrors as Partial<
          Record<keyof FullRefundInput, string[]>
        >,
        ok: false,
      };
}
