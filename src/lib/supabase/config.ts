import { z } from "zod";

const supabasePublicEnvironmentSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
  })
  .superRefine((environment, context) => {
    const url = new URL(environment.NEXT_PUBLIC_SUPABASE_URL);
    const isLocalHost =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";

    if (!isLocalHost && url.protocol !== "https:") {
      context.addIssue({
        code: "custom",
        message: "Hosted Supabase URL must use HTTPS.",
        path: ["NEXT_PUBLIC_SUPABASE_URL"],
      });
    }
  })
  .transform((environment) => ({
    url: environment.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }));

export type SupabasePublicEnvironment = z.infer<
  typeof supabasePublicEnvironmentSchema
>;

export function parseSupabasePublicEnvironment(
  values: Record<string, string | undefined>,
): SupabasePublicEnvironment {
  return supabasePublicEnvironmentSchema.parse(values);
}

export function getSupabasePublicEnvironment(): SupabasePublicEnvironment {
  return parseSupabasePublicEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
