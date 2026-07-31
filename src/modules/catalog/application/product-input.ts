import { z } from "zod";

const optionalTrimmedText = (maximumLength: number) =>
  z
    .string()
    .trim()
    .max(maximumLength)
    .transform((value) => value || null);

const compatibilitySchema = z
  .string()
  .trim()
  .min(2)
  .max(10_000)
  .transform((value, context): Record<string, unknown> => {
    try {
      const parsed: unknown = JSON.parse(value);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        context.addIssue({
          code: "custom",
          message: "Compatibility ต้องเป็น JSON object",
        });
        return z.NEVER;
      }

      return parsed as Record<string, unknown>;
    } catch {
      context.addIssue({
        code: "custom",
        message: "Compatibility JSON ไม่ถูกต้อง",
      });
      return z.NEVER;
    }
  });

const productFormSchema = z.object({
  brandName: z.string().trim().min(1).max(100),
  collectionId: z
    .union([z.literal(""), z.uuid()])
    .transform((value) => value || null),
  compatibilityJson: compatibilitySchema,
  description: z.string().trim().min(10).max(20_000),
  isIndexable: z
    .unknown()
    .transform((value) => value === "on" || value === true),
  mood: optionalTrimmedText(120),
  name: z.string().trim().min(2).max(160),
  schemaCategory: z.string().trim().min(2).max(160),
  seoDescription: optionalTrimmedText(320),
  seoTitle: optionalTrimmedText(120),
  shortDescription: z.string().trim().min(10).max(500),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: z.enum(["draft", "published", "archived"]),
});

type ProductFormInput = z.input<typeof productFormSchema>;

export type ProductInput = Omit<
  z.output<typeof productFormSchema>,
  "compatibilityJson"
> & {
  canonicalPath: string;
  compatibility: Record<string, unknown>;
};

export type ProductInputResult =
  | {
      ok: true;
      value: ProductInput;
    }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof ProductFormInput, string[]>>;
    };

export function parseProductInput(
  input: Record<string, unknown>,
): ProductInputResult {
  const result = productFormSchema.safeParse(input);

  if (!result.success) {
    return {
      ok: false,
      fieldErrors: result.error.flatten()
        .fieldErrors as Partial<
        Record<keyof ProductFormInput, string[]>
      >,
    };
  }

  const { compatibilityJson: compatibility, ...product } = result.data;

  return {
    ok: true,
    value: {
      ...product,
      canonicalPath: `/products/${product.slug}`,
      compatibility,
    },
  };
}
