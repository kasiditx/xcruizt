import { z } from "zod";

const productVersionSchema = z.object({
  changelogMd: z.string().trim().min(10).max(50_000),
  releaseNotesMd: z
    .string()
    .trim()
    .max(50_000)
    .transform((value) => value || null),
  version: z
    .string()
    .trim()
    .min(5)
    .max(64)
    .regex(
      /^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/,
    ),
});

export type ProductVersionInput = z.infer<typeof productVersionSchema>;

export type ProductVersionInputResult =
  | { ok: true; value: ProductVersionInput }
  | {
      ok: false;
      fieldErrors: Partial<
        Record<keyof ProductVersionInput, string[]>
      >;
    };

export function parseProductVersionInput(
  input: Record<string, unknown>,
): ProductVersionInputResult {
  const result = productVersionSchema.safeParse(input);

  if (!result.success) {
    return {
      ok: false,
      fieldErrors: result.error.flatten()
        .fieldErrors as Partial<
        Record<keyof ProductVersionInput, string[]>
      >,
    };
  }

  return { ok: true, value: result.data };
}
