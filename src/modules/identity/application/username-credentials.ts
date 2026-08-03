import { z } from "zod";

type UsernameCredentialsInput = {
  username: unknown;
  password: unknown;
};

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "support",
  "system",
  "xcruizt",
]);

const usernameSchema = z.preprocess(
  (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/)
    .refine((username) => !RESERVED_USERNAMES.has(username)),
);

const usernameCredentialsSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8).max(72),
});

export type UsernameCredentials = z.infer<typeof usernameCredentialsSchema>;

export function passwordsMatch(password: unknown, confirmation: unknown): boolean {
  return (
    typeof password === "string" &&
    typeof confirmation === "string" &&
    password.length > 0 &&
    password === confirmation
  );
}

export function parseUsername(value: unknown): string {
  return usernameSchema.parse(value);
}

export function parseUsernameCredentials(
  input: UsernameCredentialsInput,
): UsernameCredentials {
  return usernameCredentialsSchema.parse(input);
}

export function toInternalAuthEmail(username: string): string {
  const normalizedUsername = parseUsername(username);

  return `${normalizedUsername}@users.xcruizt.invalid`;
}
