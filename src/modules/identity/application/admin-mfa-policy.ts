export function isAdminMfaRequired(
  appEnvironment: "local" | "preview" | "production" | "staging",
  currentLevel: string | null,
): boolean {
  return appEnvironment !== "local" && currentLevel !== "aal2";
}

export function resolveAdminMfaNextPath(
  value: string | null | undefined,
): string {
  if (
    !value ||
    !value.startsWith("/admin") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/admin";
  }

  return value;
}
