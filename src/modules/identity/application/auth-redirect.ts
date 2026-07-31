export const DEFAULT_SIGNED_IN_PATH = "/account/library";

const REDIRECT_BASE_URL = "https://xcruizt.invalid";

export function resolveSafeAuthRedirect(
  candidate: string | null | undefined,
): string {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return DEFAULT_SIGNED_IN_PATH;
  }

  const redirectUrl = new URL(candidate, REDIRECT_BASE_URL);

  if (redirectUrl.origin !== REDIRECT_BASE_URL) {
    return DEFAULT_SIGNED_IN_PATH;
  }

  return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
}

export function resolveLoginPageRedirect(
  accountStatus: "anonymous" | "profile_required" | "ready",
  nextPath: string,
): string | null {
  if (accountStatus === "anonymous") {
    return null;
  }

  if (accountStatus === "profile_required") {
    return `/auth/complete-profile?next=${encodeURIComponent(nextPath)}`;
  }

  return nextPath;
}
