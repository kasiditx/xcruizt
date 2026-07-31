import * as Sentry from "@sentry/nextjs";

import { getOptionalSentryEnvironment } from "@/lib/env/sentry";
import { sanitizeSentryEvent } from "@/lib/observability/sentry-scrubber";

const environment = getOptionalSentryEnvironment();

Sentry.init({
  beforeSend: sanitizeSentryEvent,
  dsn: environment?.dsn,
  enabled: Boolean(environment),
  environment: process.env.APP_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: environment?.tracesSampleRate ?? 0,
});
