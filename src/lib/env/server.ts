import "server-only";

import { parseAppEnvironment } from "./schema";

export const env = parseAppEnvironment({
  APP_ENV: process.env.APP_ENV,
  NEXT_PUBLIC_MEDIA_ORIGIN: process.env.NEXT_PUBLIC_MEDIA_ORIGIN,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  LOG_LEVEL: process.env.LOG_LEVEL,
});
