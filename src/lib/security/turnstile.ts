import { getTurnstileEnvironment } from "@/lib/env/turnstile";
import { env } from "@/lib/env/server";
import { logServerError, logServerWarning } from "@/lib/observability/logger";
import {
  evaluateTurnstileResponse,
  turnstileTokenSchema,
  type TurnstileAction,
} from "./turnstile-policy";

const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TIMEOUT_MS = 5_000;

export async function verifyTurnstile(input: {
  action: TurnstileAction;
  remoteIp: string | null;
  token: unknown;
}): Promise<"invalid" | "unavailable" | "verified"> {
  const hasConfiguration = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
      process.env.TURNSTILE_SECRET_KEY,
  );
  if (!hasConfiguration && env.APP_ENV === "local") return "verified";

  const token = turnstileTokenSchema.safeParse(input.token);
  if (!token.success) return "invalid";

  let environment: ReturnType<typeof getTurnstileEnvironment>;
  try {
    environment = getTurnstileEnvironment();
  } catch {
    logServerError("turnstile.configuration_invalid", {
      action: input.action,
    });
    return "unavailable";
  }

  try {
    const response = await fetch(TURNSTILE_SITEVERIFY_URL, {
      body: JSON.stringify({
        remoteip: input.remoteIp ?? undefined,
        response: token.data,
        secret: environment.secretKey,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
    });
    if (!response.ok) {
      logServerWarning("turnstile.provider_rejected", {
        action: input.action,
        providerStatus: response.status,
      });
      return "unavailable";
    }

    const result: unknown = await response.json();
    return evaluateTurnstileResponse(result, {
      action: input.action,
      hostname: new URL(env.NEXT_PUBLIC_SITE_URL).hostname,
    })
      ? "verified"
      : "invalid";
  } catch {
    logServerError("turnstile.verification_failed", {
      action: input.action,
    });
    return "unavailable";
  }
}
