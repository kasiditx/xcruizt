import { z } from "zod";

type IdentityLike = {
  identity_data?: Record<string, unknown>;
  provider: string;
  provider_id: string;
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

export function parseDiscordIdentity(identity: IdentityLike): {
  avatarUrl: string | null;
  email: string | null;
  userId: string;
  username: string | null;
} | null {
  if (
    identity.provider !== "discord" ||
    !/^\d{5,25}$/.test(identity.provider_id)
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
