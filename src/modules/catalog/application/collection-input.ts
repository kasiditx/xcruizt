import { z } from "zod";

const optionalTrimmedText = (maximumLength: number) =>
  z
    .string()
    .trim()
    .max(maximumLength)
    .transform((value) => value || null);

const collectionInputSchema = z.object({
  accentKey: optionalTrimmedText(40),
  description: z.string().trim().min(10).max(5_000),
  name: z.string().trim().min(2).max(120),
  seoDescription: optionalTrimmedText(320),
  seoTitle: optionalTrimmedText(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000),
  status: z.enum(["draft", "published", "archived"]),
  tagline: optionalTrimmedText(200),
});

export type CollectionInput = z.infer<typeof collectionInputSchema>;

export type CollectionInputResult =
  | {
      ok: true;
      value: CollectionInput;
    }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof CollectionInput, string[]>>;
    };

export function parseCollectionInput(
  input: Record<string, unknown>,
): CollectionInputResult {
  const result = collectionInputSchema.safeParse(input);

  if (!result.success) {
    return {
      ok: false,
      fieldErrors: result.error.flatten()
        .fieldErrors as Partial<Record<keyof CollectionInput, string[]>>,
    };
  }

  return {
    ok: true,
    value: result.data,
  };
}
