import "server-only";

import { Resend } from "resend";

import type { ResendEnvironment } from "@/lib/env/resend";
import type { TransactionalEmailMessage } from "../application/email-message";
import { NotificationProviderError } from "../application/provider-error";

export async function sendTransactionalEmail(input: {
  environment: ResendEnvironment;
  eventId: string;
  message: TransactionalEmailMessage;
  recipient: string;
}): Promise<string> {
  const resend = new Resend(input.environment.apiKey);
  let result: Awaited<ReturnType<typeof resend.emails.send>>;

  try {
    result = await resend.emails.send(
      {
        from: input.environment.from,
        replyTo: input.environment.replyTo,
        subject: input.message.subject,
        text: input.message.text,
        to: input.recipient,
      },
      { idempotencyKey: `outbox-${input.eventId}` },
    );
  } catch {
    throw new NotificationProviderError(
      "email_provider_unavailable",
      true,
    );
  }

  if (result.error) {
    const retryable =
      result.error.statusCode === 429 ||
      (result.error.statusCode !== null &&
        result.error.statusCode >= 500) ||
      result.error.name === "concurrent_idempotent_requests";
    throw new NotificationProviderError(
      retryable
        ? "email_provider_unavailable"
        : "email_provider_rejected",
      retryable,
    );
  }

  return result.data.id;
}
