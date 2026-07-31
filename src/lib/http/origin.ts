export function hasExpectedOrigin(
  headers: Headers,
  expectedSiteUrl: string,
): boolean {
  const origin = headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(expectedSiteUrl).origin;
  } catch {
    return false;
  }
}
