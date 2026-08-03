import { z } from "zod";

type IdentityLike = {
  identity_data?: Record<string, unknown>;
  provider: string;
  provider_id: string;
};

type RuntimeIdentityLike = {
  identity_data?: Record<string, unknown>;
  identity_id?: unknown;
  provider: string;
  provider_id?: unknown;
};

const emailSchema = z
  .email()
  .max(254)
  .refine((value) => !value.endsWith("@users.xcruizt.invalid"));
const usernameSchema = z.string().trim().min(1).max(100);
const avatarUrlSchema = z
  .url()
  .max(2_000)
  .refine((value) => new URL(value).protocol === "https:");
const discordUserIdSchema = z.string().regex(/^\d{5,25}$/);

export function parseDiscordRuntimeIdentity(
  identity: RuntimeIdentityLike,
): ReturnType<typeof parseDiscordIdentity> {
  const data = identity.identity_data ?? {};
  const providerId = [
    identity.provider_id,
    data.provider_id,
    data.sub,
    identity.identity_id,
  ]
    .map((candidate) => discordUserIdSchema.safeParse(candidate))
    .find((candidate) => candidate.success);

  return parseDiscordIdentity({
    identity_data: identity.identity_data,
    provider: identity.provider,
    provider_id: providerId?.data ?? "",
  });
}

export function parseDiscordIdentity(identity: IdentityLike): {
  avatarUrl: string | null;
  email: string | null;
  userId: string;
  username: string | null;
} | null {
  if (
    identity.provider !== "discord" ||
    !discordUserIdSchema.safeParse(identity.provider_id).success
  ) {
    return null;
  }

  const data = identity.identity_data ?? {};
  const avatarUrl = avatarUrlSchema.safeParse(data.avatar_url);
  const email = emailSchema.safeParse(data.email);
  const username = usernameSchema.safeParse(
    data.full_name ?? data.name,
  );

  return {
    avatarUrl: avatarUrl.success ? avatarUrl.data : null,
    email: email.success ? email.data : null,
    userId: identity.provider_id,
    username: username.success ? username.data : null,
  };
}
