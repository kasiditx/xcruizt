import { z } from "zod";

function thaiBahtToSatang(value: string): number {
  const [baht, fraction = ""] = value.split(".");
  return Number(baht) * 100 + Number(fraction.padEnd(2, "0"));
}

const moneySchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,2})?$/)
  .transform(thaiBahtToSatang)
  .pipe(z.number().int().min(0).max(2_000_000_000));

const optionalMoneySchema = z
  .union([z.literal(""), moneySchema])
  .transform((value) => (value === "" ? null : value));

const optionalPositiveInteger = z
  .union([z.literal(""), z.coerce.number().int().min(1).max(1_000)])
  .transform((value) => (value === "" ? null : value));

const skuFormSchema = z
  .object({
    compareAtPriceThaiBaht: optionalMoneySchema,
    currency: z.literal("THB"),
    name: z.string().trim().min(2).max(160),
    priceThaiBaht: moneySchema,
    productIds: z
      .array(z.uuid())
      .min(1)
      .transform((values) => [...new Set(values)]),
    purchaseLimit: optionalPositiveInteger,
    skuCode: z
      .string()
      .trim()
      .toUpperCase()
      .min(2)
      .max(100)
      .regex(/^[A-Z0-9]+(?:[A-Z0-9_-]*[A-Z0-9])?$/),
    skuType: z.enum(["single", "collection", "bundle"]),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: z.enum(["draft", "active", "inactive", "archived"]),
    stripePriceId: z
      .string()
      .trim()
      .max(255)
      .refine(
        (value) => !value || /^price_[A-Za-z0-9]+$/.test(value),
        "Stripe Price ID ไม่ถูกต้อง",
      )
      .transform((value) => value || null),
  })
  .superRefine((value, context) => {
    if (
      value.compareAtPriceThaiBaht !== null &&
      value.compareAtPriceThaiBaht <= value.priceThaiBaht
    ) {
      context.addIssue({
        code: "custom",
        message: "Compare-at price ต้องมากกว่าราคาขาย",
        path: ["compareAtPriceThaiBaht"],
      });
    }
  });

type SkuFormInput = z.input<typeof skuFormSchema>;

export type SkuInput = Omit<
  z.output<typeof skuFormSchema>,
  "compareAtPriceThaiBaht" | "priceThaiBaht"
> & {
  compareAtPriceSatang: number | null;
  priceSatang: number;
};

export type SkuInputResult =
  | { ok: true; value: SkuInput }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof SkuFormInput, string[]>>;
    };

export function parseSkuInput(
  input: Record<string, unknown>,
): SkuInputResult {
  const result = skuFormSchema.safeParse(input);

  if (!result.success) {
    return {
      ok: false,
      fieldErrors: result.error.flatten()
        .fieldErrors as Partial<Record<keyof SkuFormInput, string[]>>,
    };
  }

  const {
    compareAtPriceThaiBaht: compareAtPriceSatang,
    priceThaiBaht: priceSatang,
    ...sku
  } = result.data;

  return {
    ok: true,
    value: {
      ...sku,
      compareAtPriceSatang,
      priceSatang,
    },
  };
}
