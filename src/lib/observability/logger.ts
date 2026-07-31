import "server-only";

import * as Sentry from "@sentry/nextjs";

import {
  redactLogContext,
  type LogContext,
  type LogValue,
} from "./logger-policy";

function sentryTags(
  event: string,
  context: Record<string, Exclude<LogValue, undefined>>,
) {
  return Object.fromEntries(
    Object.entries({ event, ...context })
      .filter(([, value]) => value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
}

export function logServerError(
  event: string,
  context: LogContext = {},
  cause?: unknown,
) {
  const safeContext = redactLogContext(context);
  console.error(
    JSON.stringify({
      ...safeContext,
      event,
      level: "error",
      timestamp: new Date().toISOString(),
    }),
  );

  const captureContext = { tags: sentryTags(event, safeContext) };
  if (cause === undefined) {
    Sentry.captureMessage(event, { ...captureContext, level: "error" });
    return;
  }

  Sentry.captureException(cause, captureContext);
}

export function logServerWarning(event: string, context: LogContext = {}) {
  console.warn(
    JSON.stringify({
      ...redactLogContext(context),
      event,
      level: "warn",
      timestamp: new Date().toISOString(),
    }),
  );
}
