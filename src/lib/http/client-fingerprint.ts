import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export function extractClientIp(headers: Headers): string | null {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
    headers.get("x-real-ip"),
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && isIP(value) !== 0) return value;
  }

  return null;
}

export function hashSensitiveValue(
  value: string,
  secret: string,
): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}
