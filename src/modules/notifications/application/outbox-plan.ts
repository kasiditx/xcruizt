import { z } from "zod";

const userEventSchema = z.object({
  productId: z.uuid().optional(),
  orderId: z.uuid().optional(),
  orderNumber: z.string().trim().min(1).max(100).optional(),
  status: z.string().trim().min(1).max(50).optional(),
  userId: z.uuid(),
  version: z.string().trim().min(1).max(100).optional(),
});

const versionPublishedSchema = z.object({
  productId: z.uuid(),
  productVersionId: z.uuid(),
  version: z.string().trim().min(1).max(100),
});

export type CustomerEmailKind =
  | "entitlement_granted"
  | "entitlement_revoked"
  | "order_paid"
  | "product_version_available"
  | "refund_processed";

export const OUTBOX_MAX_ATTEMPTS = 8;

export function getOutboxRetryDelayMs(attemptCount: number): number {
  const normalizedAttempt = Math.max(1, Math.trunc(attemptCount));
  return Math.min(30 * 60_000, 15_000 * 2 ** (normalizedAttempt - 1));
}

export type OutboxDeliveryPlan =
  | {
      kind: "customer";
      emailKind: CustomerEmailKind | null;
      enqueueDiscordSync: boolean;
      orderId: string | null;
      orderNumber: string | null;
      productId: string | null;
      userId: string;
      version: string | null;
    }
  | {
      kind: "fanout_product_version";
      productId: string;
      productVersionId: string;
      version: string;
    }
  | { kind: "no_delivery" };

function customerPlan(
  payload: unknown,
  options: {
    emailKind: CustomerEmailKind | null;
    enqueueDiscordSync: boolean;
  },
): OutboxDeliveryPlan | null {
  const parsed = userEventSchema.safeParse(payload);
  if (!parsed.success) return null;

  return {
    kind: "customer",
    emailKind: options.emailKind,
    enqueueDiscordSync: options.enqueueDiscordSync,
    orderId: parsed.data.orderId ?? null,
    orderNumber: parsed.data.orderNumber ?? null,
    productId: parsed.data.productId ?? null,
    userId: parsed.data.userId,
    version: parsed.data.version ?? null,
  };
}

export function createOutboxDeliveryPlan(
  topic: string,
  payload: unknown,
): OutboxDeliveryPlan | null {
  if (topic === "order.paid") {
    return customerPlan(payload, {
      emailKind: "order_paid",
      enqueueDiscordSync: true,
    });
  }
  if (topic === "entitlement.granted") {
    return customerPlan(payload, {
      emailKind: "entitlement_granted",
      enqueueDiscordSync: true,
    });
  }
  if (topic === "entitlement.revoked") {
    return customerPlan(payload, {
      emailKind: "entitlement_revoked",
      enqueueDiscordSync: true,
    });
  }
  if (topic === "refund.completed") {
    return customerPlan(payload, {
      emailKind: "refund_processed",
      enqueueDiscordSync: true,
    });
  }
  if (topic === "refund.status_changed") {
    const parsed = userEventSchema.safeParse(payload);
    if (!parsed.success) return null;
    if (parsed.data.status !== "succeeded") return { kind: "no_delivery" };
    return customerPlan(parsed.data, {
      emailKind: "refund_processed",
      enqueueDiscordSync: true,
    });
  }
  if (topic === "refund.created") return { kind: "no_delivery" };
  if (topic === "product.version.published") {
    const parsed = versionPublishedSchema.safeParse(payload);
    if (!parsed.success) return null;
    return { kind: "fanout_product_version", ...parsed.data };
  }
  if (topic === "product.version.available") {
    return customerPlan(payload, {
      emailKind: "product_version_available",
      enqueueDiscordSync: false,
    });
  }

  return null;
}
