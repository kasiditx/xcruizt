import * as Sentry from "@sentry/nextjs";

import { sanitizeSentryEvent } from "@/lib/observability/sentry-scrubber";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

Sentry.init({
  beforeSend: sanitizeSentryEvent,
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
});

export const onRouterTransitionStart =
  Sentry.captureRouterTransitionStart;
