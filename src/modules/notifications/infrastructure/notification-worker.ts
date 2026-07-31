import "server-only";

import { getResendEnvironment } from "@/lib/env/resend";
import { env } from "@/lib/env/server";
import { enqueueDiscordFullSync } from "@/modules/identity/infrastructure/discord-profile";
import { NotificationProviderError } from "../application/provider-error";
import { processNextOutboxEvent } from "../application/process-outbox";
import {
  claimOutboxEvent,
  completeOutboxEvent,
  createProductVersionNotificationFanout,
  failOutboxEvent,
  getOutboxEmailContext,
} from "./outbox-repository";
import { sendTransactionalEmail } from "./resend-email";

export function runNextNotificationOutboxEvent() {
  let resendEnvironment: ReturnType<typeof getResendEnvironment> | null;
  try {
    resendEnvironment = getResendEnvironment();
  } catch {
    resendEnvironment = null;
  }

  return processNextOutboxEvent({
    claimEvent: claimOutboxEvent,
    completeEvent: completeOutboxEvent,
    createVersionFanout: createProductVersionNotificationFanout,
    enqueueDiscordSync: enqueueDiscordFullSync,
    failEvent: failOutboxEvent,
    getEmailContext: getOutboxEmailContext,
    sendEmail: async (input) => {
      if (!resendEnvironment) {
        throw new NotificationProviderError(
          "email_provider_unavailable",
          true,
        );
      }
      return sendTransactionalEmail({
        ...input,
        environment: resendEnvironment,
      });
    },
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
  });
}
