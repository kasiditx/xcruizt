import { z } from "zod";

const appEnvironmentSchema = z
  .object({
    APP_ENV: z
      .enum(["local", "preview", "staging", "production"])
      .default("local"),
    NEXT_PUBLIC_SITE_URL: z
      .string()
      .url()
      .default("http://localhost:3000"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .superRefine((environment, context) => {
    const siteUrl = new URL(environment.NEXT_PUBLIC_SITE_URL);

    if (
      environment.APP_ENV === "production" &&
      siteUrl.protocol !== "https:"
    ) {
      context.addIssue({
        code: "custom",
        message: "Production site URL must use HTTPS.",
        path: ["NEXT_PUBLIC_SITE_URL"],
      });
    }
  });

export type AppEnvironment = z.infer<typeof appEnvironmentSchema>;

export function parseAppEnvironment(
  values: Record<string, string | undefined>,
): AppEnvironment {
  return appEnvironmentSchema.parse(values);
}
