import { describe, expect, it, vi } from "vitest";

import { NotificationProviderError } from "./provider-error";
import {
  processNextOutboxEvent,
  type ProcessOutboxDependencies,
} from "./process-outbox";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const EVENT_ID = "00000000-0000-4000-8000-000000000002";

function dependencies() {
  const result = {
    claimEvent: vi.fn<ProcessOutboxDependencies["claimEvent"]>(async () => ({
      attemptCount: 1,
      id: EVENT_ID,
      payload: {
        orderId: "00000000-0000-4000-8000-000000000003",
        orderNumber: "XRZT-001",
        userId: USER_ID,
      },
      topic: "order.paid",
    })),
    completeEvent: vi.fn<ProcessOutboxDependencies["completeEvent"]>(async () => undefined),
    createVersionFanout: vi.fn<ProcessOutboxDependencies["createVersionFanout"]>(async () => undefined),
    enqueueDiscordSync: vi.fn<ProcessOutboxDependencies["enqueueDiscordSync"]>(async () => "queued"),
    failEvent: vi.fn<ProcessOutboxDependencies["failEvent"]>(async () => undefined),
    getEmailContext: vi.fn<ProcessOutboxDependencies["getEmailContext"]>(async () => ({
      orderNumber: "XRZT-001",
      productName: null,
      recipient: "customer@example.com",
      totalSatang: 99_900,
      username: "customer",
      version: null,
    })),
    sendEmail: vi.fn<ProcessOutboxDependencies["sendEmail"]>(async () => "email-id"),
    siteUrl: "https://xcruizt.example",
  };

  return result satisfies ProcessOutboxDependencies;
}

describe("processNextOutboxEvent", () => {
  it("delivers paid-order side effects and completes by event ID", async () => {
    const deps = dependencies();

    await expect(processNextOutboxEvent(deps)).resolves.toEqual({
      delivery: "sent",
      status: "completed",
    });
    expect(deps.enqueueDiscordSync).toHaveBeenCalledWith(USER_ID);
    expect(deps.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: EVENT_ID,
        recipient: "customer@example.com",
      }),
    );
    expect(deps.completeEvent).toHaveBeenCalledWith(
      EVENT_ID,
      "email-id",
    );
  });

  it("completes safely when the customer has no real email", async () => {
    const deps = dependencies();
    deps.getEmailContext.mockResolvedValue({
      orderNumber: "XRZT-001",
      productName: null,
      recipient: null,
      totalSatang: 99_900,
      username: "customer",
      version: null,
    });

    await expect(processNextOutboxEvent(deps)).resolves.toEqual({
      delivery: "skipped_no_email",
      status: "completed",
    });
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it("records retryable provider failure without affecting domain state", async () => {
    const deps = dependencies();
    deps.sendEmail.mockRejectedValue(
      new NotificationProviderError(
        "email_provider_unavailable",
        true,
      ),
    );

    await expect(processNextOutboxEvent(deps)).resolves.toEqual({
      retryScheduled: true,
      status: "failed",
    });
    expect(deps.failEvent).toHaveBeenCalledWith({
      attemptCount: 1,
      errorCode: "email_provider_unavailable",
      eventId: EVENT_ID,
      retryable: true,
    });
    expect(deps.completeEvent).not.toHaveBeenCalled();
  });

  it("dead-letters malformed events", async () => {
    const deps = dependencies();
    deps.claimEvent.mockResolvedValue({
      attemptCount: 1,
      id: EVENT_ID,
      payload: {},
      topic: "unknown.topic",
    });

    await expect(processNextOutboxEvent(deps)).resolves.toEqual({
      retryScheduled: false,
      status: "failed",
    });
    expect(deps.failEvent).toHaveBeenCalledWith({
      attemptCount: 1,
      errorCode: "unsupported_or_invalid_event",
      eventId: EVENT_ID,
      retryable: false,
    });
  });
});
