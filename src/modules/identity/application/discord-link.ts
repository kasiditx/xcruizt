type IdentityProvider = {
  provider: string;
};

export function hasLinkedDiscordIdentity(
  identities: readonly IdentityProvider[],
): boolean {
  return identities.some((identity) => identity.provider === "discord");
}
