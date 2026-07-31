import {
  parseDiscordBotEnvironment,
  parseDiscordOAuthEnvironment,
} from "@/lib/env/discord";
import { parseQStashPublisherEnvironment, parseQStashReceiverEnvironment } from "@/lib/env/qstash";
import { parseR2Environment } from "@/lib/env/r2";
import { parseResendEnvironment } from "@/lib/env/resend";
import { parseSentryEnvironment } from "@/lib/env/sentry";
import type { AppEnvironment } from "@/lib/env/schema";
import { parseStripeEnvironment } from "@/lib/env/stripe";
import { parseTurnstileEnvironment } from "@/lib/env/turnstile";
import { parseUpstashRedisEnvironment } from "@/lib/env/upstash";
import { parseSupabasePublicEnvironment } from "@/lib/supabase/config";

type ApplicationEnvironment = AppEnvironment["APP_ENV"];
type ProviderName =
  | "discord"
  | "qstash"
  | "r2"
  | "resend"
  | "sentry"
  | "stripe"
  | "supabase"
  | "turnstile"
  | "upstash";

type ProviderDefinition = {
  keys: string[];
  name: ProviderName;
  requiredForCommerce: boolean;
  validate: (values: Record<string, string | undefined>) => void;
};

const providers: ProviderDefinition[] = [
  {
    keys: [
      "DISCORD_BOT_TOKEN",
      "DISCORD_CLIENT_ID",
      "DISCORD_CLIENT_SECRET",
      "DISCORD_GUILD_ID",
    ],
    name: "discord",
    requiredForCommerce: false,
    validate(values) {
      parseDiscordOAuthEnvironment(values);
      parseDiscordBotEnvironment(values);
    },
  },
  {
    keys: [
      "QSTASH_CURRENT_SIGNING_KEY",
      "QSTASH_NEXT_SIGNING_KEY",
      "QSTASH_TOKEN",
    ],
    name: "qstash",
    requiredForCommerce: true,
    validate(values) {
      parseQStashPublisherEnvironment(values);
      parseQStashReceiverEnvironment(values);
    },
  },
  {
    keys: [
      "PRIVACY_HASH_SECRET",
      "R2_ACCESS_KEY_ID",
      "R2_ACCOUNT_ID",
      "R2_BUCKET_PRIVATE",
      "R2_SECRET_ACCESS_KEY",
    ],
    name: "r2",
    requiredForCommerce: true,
    validate: parseR2Environment,
  },
  {
    keys: ["EMAIL_FROM", "EMAIL_REPLY_TO", "RESEND_API_KEY"],
    name: "resend",
    requiredForCommerce: true,
    validate: parseResendEnvironment,
  },
  {
    keys: ["NEXT_PUBLIC_SENTRY_DSN", "SENTRY_TRACES_SAMPLE_RATE"],
    name: "sentry",
    requiredForCommerce: true,
    validate: parseSentryEnvironment,
  },
  {
    keys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    name: "stripe",
    requiredForCommerce: true,
    validate: parseStripeEnvironment,
  },
  {
    keys: [
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
    ],
    name: "supabase",
    requiredForCommerce: true,
    validate: parseSupabasePublicEnvironment,
  },
  {
    keys: [
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
      "TURNSTILE_SECRET_KEY",
    ],
    name: "turnstile",
    requiredForCommerce: true,
    validate: parseTurnstileEnvironment,
  },
  {
    keys: ["UPSTASH_REDIS_REST_TOKEN", "UPSTASH_REDIS_REST_URL"],
    name: "upstash",
    requiredForCommerce: true,
    validate: parseUpstashRedisEnvironment,
  },
];

function isConfiguredValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function requiresCompleteCommerceConfiguration(
  environment: ApplicationEnvironment,
): boolean {
  return environment === "staging" || environment === "production";
}

export function inspectReadinessConfiguration(
  environment: ApplicationEnvironment,
  values: Record<string, string | undefined>,
): { blocking: ProviderName[]; degraded: ProviderName[] } {
  const blocking: ProviderName[] = [];
  const degraded: ProviderName[] = [];
  const strictEnvironment = requiresCompleteCommerceConfiguration(environment);

  for (const provider of providers) {
    const configuredKeys = provider.keys.filter((key) =>
      isConfiguredValue(values[key]),
    );
    const isMissing = configuredKeys.length === 0;

    if (isMissing) {
      if (strictEnvironment && provider.requiredForCommerce) {
        blocking.push(provider.name);
      } else if (strictEnvironment) {
        degraded.push(provider.name);
      }
      continue;
    }

    try {
      provider.validate(values);
    } catch {
      if (environment === "local") {
        degraded.push(provider.name);
      } else {
        blocking.push(provider.name);
      }
    }
  }

  return {
    blocking: blocking.sort(),
    degraded: degraded.sort(),
  };
}
