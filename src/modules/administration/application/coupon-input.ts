import { z } from "zod";

const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/);
const localDateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
const moneySchema = z.string().trim().regex(/^\d{1,7}(?:\.\d{1,2})?$/);
const positiveIntegerSchema = z.coerce.number().int().positive().max(1_000_000);

function parseOptionalMoney(value: unknown): number | null | undefined {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = moneySchema.safeParse(value);
  if (!parsed.success) return undefined;
  return Math.round(Number(parsed.data) * 100);
}

function parseOptionalInteger(value: unknown): number | null | undefined {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = positiveIntegerSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function parseBangkokDateTime(value: unknown): Date | null {
  const parsed = localDateTimeSchema.safeParse(value);
  if (!parsed.success) return null;
  const date = new Date(`${parsed.data}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type CouponInput = {
  code: string;
  discountType: "fixed" | "percent";
  discountValue: number;
  endsAt: Date;
  maximumDiscountSatang: number | null;
  minimumAmountSatang: number | null;
  perUserLimit: number | null;
  startsAt: Date;
  usageLimit: number | null;
};

export function parseCouponInput(
  input: Record<string, unknown>,
): { ok: true; value: CouponInput } | { ok: false } {
  const code = codeSchema.safeParse(input.code);
  const discountType = z.enum(["fixed", "percent"]).safeParse(
    input.discountType,
  );
  const startsAt = parseBangkokDateTime(input.startsAt);
  const endsAt = parseBangkokDateTime(input.endsAt);
  const minimumAmountSatang = parseOptionalMoney(input.minimumAmount);
  const maximumDiscountSatang = parseOptionalMoney(
    input.maximumDiscount,
  );
  const usageLimit = parseOptionalInteger(input.usageLimit);
  const perUserLimit = parseOptionalInteger(input.perUserLimit);

  if (
    !code.success ||
    !discountType.success ||
    !startsAt ||
    !endsAt ||
    endsAt <= startsAt ||
    minimumAmountSatang === undefined ||
    maximumDiscountSatang === undefined ||
    usageLimit === undefined ||
    perUserLimit === undefined ||
    (usageLimit !== null &&
      perUserLimit !== null &&
      perUserLimit > usageLimit)
  ) {
    return { ok: false };
  }

  let discountValue: number;
  if (discountType.data === "percent") {
    const percent = z.coerce.number().int().min(1).max(100).safeParse(
      input.discountValue,
    );
    if (!percent.success) return { ok: false };
    discountValue = percent.data;
  } else {
    const fixed = parseOptionalMoney(input.discountValue);
    if (fixed === null || fixed === undefined || fixed <= 0) {
      return { ok: false };
    }
    discountValue = fixed;
  }

  return {
    ok: true,
    value: {
      code: code.data,
      discountType: discountType.data,
      discountValue,
      endsAt,
      maximumDiscountSatang,
      minimumAmountSatang,
      perUserLimit,
      startsAt,
      usageLimit,
    },
  };
}
