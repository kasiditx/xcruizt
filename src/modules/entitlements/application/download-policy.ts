export type DownloadRateLimitDecision =
  | { allowed: true }
  | { allowed: false; reason: "ip_limit" | "user_limit" };

export function evaluateDownloadRateLimit(input: {
  ipAttempts: number;
  ipLimit: number;
  userAttempts: number;
  userLimit: number;
}): DownloadRateLimitDecision {
  if (input.userAttempts >= input.userLimit) {
    return { allowed: false, reason: "user_limit" };
  }
  if (input.ipAttempts >= input.ipLimit) {
    return { allowed: false, reason: "ip_limit" };
  }
  return { allowed: true };
}

export function buildSafeContentDisposition(filename: string): string {
  const sanitized =
    filename
      .replace(/[\r\n]/g, "")
      .replace(/[\\"]/g, "")
      .trim() || "xcruizt-download";
  const encoded = encodeURIComponent(
    filename.replace(/[\r\n]/g, "").trim() ||
      "xcruizt-download",
  );

  return `attachment; filename="${sanitized}"; filename*=UTF-8''${encoded}`;
}
