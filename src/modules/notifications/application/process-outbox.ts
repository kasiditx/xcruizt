import {
  createTransactionalEmailMessage,
  type TransactionalEmailContext,
  type TransactionalEmailMessage,
} from "./email-message";
import {
  createOutboxDeliveryPlan,
  type OutboxDeliveryPlan,
} from "./outbox-plan";
import { NotificationProviderError } from "./provider-error";

export type ClaimedOutboxEvent = {
  attemptCount: number;
  id: string;
  payload: unknown;
  topic: string;
};

export type EmailDeliveryContext = Omit<
  TransactionalEmailContext,
  "kind" | "siteUrl"
> & {
  recipient: string | null;
};

export type ProcessOutboxDependencies = {
  claimEvent(): Promise<ClaimedOutboxEvent | null>;
  completeEvent(eventId: string, providerMessageId?: string): Promise<void>;
  createVersionFanout(input: {
    eventId: string;
    productId: string;
    productVersionId: string;
    version: string;
  }): Promise<void>;
  enqueueDiscordSync(userId: string): Promise<unknown>;
  failEvent(input: {
    attemptCount: number;
    errorCode: string;
    eventId: string;
    retryable: boolean;
  }): Promise<void>;
  getEmailContext(
    plan: Extract<OutboxDeliveryPlan, { kind: "customer" }>,
  ): Promise<EmailDeliveryContext | null>;
  sendEmail(input: {
    eventId: string;
    message: TransactionalEmailMessage;
    recipient: string;
  }): Promise<string>;
  siteUrl: string;
};

export type ProcessOutboxResult =
  | { status: "idle" }
  | { retryScheduled: boolean; status: "failed" }
  | {
      delivery: "fanout" | "none" | "sent" | "skipped_no_email";
      status: "completed";
    };

export async function processNextOutboxEvent(
  dependencies: ProcessOutboxDependencies,
): Promise<ProcessOutboxResult> {
  const event = await dependencies.claimEvent();
  if (!event) return { status: "idle" };

  const plan = createOutboxDeliveryPlan(event.topic, event.payload);
  if (!plan) {
    await dependencies.failEvent({
      attemptCount: event.attemptCount,
      errorCode: "unsupported_or_invalid_event",
      eventId: event.id,
      retryable: false,
    });
    return { retryScheduled: false, status: "failed" };
  }

  try {
    if (plan.kind === "no_delivery") {
      await dependencies.completeEvent(event.id);
      return { delivery: "none", status: "completed" };
    }

    if (plan.kind === "fanout_product_version") {
      await dependencies.createVersionFanout({
        eventId: event.id,
        productId: plan.productId,
        productVersionId: plan.productVersionId,
        version: plan.version,
      });
      await dependencies.completeEvent(event.id);
      return { delivery: "fanout", status: "completed" };
    }

    if (plan.enqueueDiscordSync) {
      await dependencies.enqueueDiscordSync(plan.userId);
    }

    if (!plan.emailKind) {
      await dependencies.completeEvent(event.id);
      return { delivery: "none", status: "completed" };
    }

    const context = await dependencies.getEmailContext(plan);
    if (!context?.recipient) {
      await dependencies.completeEvent(event.id);
      return { delivery: "skipped_no_email", status: "completed" };
    }

    const message = createTransactionalEmailMessage({
      ...context,
      kind: plan.emailKind,
      siteUrl: dependencies.siteUrl,
    });
    const providerMessageId = await dependencies.sendEmail({
      eventId: event.id,
      message,
      recipient: context.recipient,
    });
    await dependencies.completeEvent(event.id, providerMessageId);
    return { delivery: "sent", status: "completed" };
  } catch (error) {
    const providerError =
      error instanceof NotificationProviderError ? error : null;
    const retryable = providerError?.retryable ?? true;
    await dependencies.failEvent({
      attemptCount: event.attemptCount,
      errorCode: providerError?.code ?? "notification_dispatch_failed",
      eventId: event.id,
      retryable,
    });
    return { retryScheduled: retryable, status: "failed" };
  }
}
