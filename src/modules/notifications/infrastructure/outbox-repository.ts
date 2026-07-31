import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import {
  entitlements,
  orders,
  outboxEvents,
  products,
  profiles,
} from "@/db/schema";
import type {
  ClaimedOutboxEvent,
  EmailDeliveryContext,
} from "../application/process-outbox";
import type { OutboxDeliveryPlan } from "../application/outbox-plan";
import {
  OUTBOX_MAX_ATTEMPTS,
  getOutboxRetryDelayMs,
} from "../application/outbox-plan";

const deliverableEmailSchema = z
  .email()
  .max(254)
  .refine((value) => !value.endsWith("@users.xcruizt.invalid"));

export async function claimOutboxEvent(): Promise<ClaimedOutboxEvent | null> {
  return db.transaction(async (transaction) => {
    const rows = await transaction.execute<ClaimedOutboxEvent>(sql`
      with candidate as (
        select ${outboxEvents.id}
        from ${outboxEvents}
        where (
          (
            ${outboxEvents.status} in ('pending', 'failed')
            and ${outboxEvents.completedAt} is null
            and ${outboxEvents.availableAt} <= now()
          )
          or (
            ${outboxEvents.status} = 'dispatched'
            and ${outboxEvents.completedAt} is null
            and ${outboxEvents.updatedAt} <= now() - interval '5 minutes'
          )
        )
          and ${outboxEvents.attemptCount} < ${OUTBOX_MAX_ATTEMPTS}
        order by ${outboxEvents.availableAt}, ${outboxEvents.createdAt}
        for update skip locked
        limit 1
      )
      update ${outboxEvents} as event
      set
        status = 'dispatched',
        attempt_count = event.attempt_count + 1,
        last_error = null,
        updated_at = now()
      from candidate
      where event.id = candidate.id
      returning
        event.id,
        event.topic,
        event.payload,
        event.attempt_count as "attemptCount"
    `);

    return rows[0] ?? null;
  });
}

export async function completeOutboxEvent(
  eventId: string,
  providerMessageId?: string,
): Promise<void> {
  const now = new Date();
  await db
    .update(outboxEvents)
    .set({
      completedAt: now,
      lastError: null,
      ...(providerMessageId ? { providerMessageId } : {}),
      status: "completed",
      updatedAt: now,
    })
    .where(
      and(
        eq(outboxEvents.id, eventId),
        eq(outboxEvents.status, "dispatched"),
      ),
    );
}

export async function failOutboxEvent(input: {
  attemptCount: number;
  errorCode: string;
  eventId: string;
  retryable: boolean;
}): Promise<void> {
  const now = new Date();
  const terminal =
    !input.retryable || input.attemptCount >= OUTBOX_MAX_ATTEMPTS;
  await db
    .update(outboxEvents)
    .set({
      availableAt: terminal
        ? now
        : new Date(
            now.getTime() + getOutboxRetryDelayMs(input.attemptCount),
          ),
      completedAt: terminal ? now : null,
      lastError: input.errorCode.slice(0, 128),
      status: "failed",
      updatedAt: now,
    })
    .where(eq(outboxEvents.id, input.eventId));
}

export async function createProductVersionNotificationFanout(input: {
  eventId: string;
  productId: string;
  productVersionId: string;
  version: string;
}): Promise<void> {
  await db.transaction(async (transaction) => {
    const owners = await transaction
      .selectDistinct({ userId: entitlements.userId })
      .from(entitlements)
      .where(
        and(
          eq(entitlements.productId, input.productId),
          eq(entitlements.status, "active"),
        ),
      );
    if (owners.length === 0) return;

    await transaction
      .insert(outboxEvents)
      .values(
        owners.map(({ userId }) => ({
          aggregateId: input.productVersionId,
          aggregateType: "product_version",
          dedupeKey: `version:${input.eventId}:${userId}`,
          payload: {
            productId: input.productId,
            productVersionId: input.productVersionId,
            userId,
            version: input.version,
          },
          topic: "product.version.available",
        })),
      )
      .onConflictDoNothing({ target: outboxEvents.dedupeKey });
  });
}

export async function getOutboxEmailContext(
  plan: Extract<OutboxDeliveryPlan, { kind: "customer" }>,
): Promise<EmailDeliveryContext | null> {
  const [profile] = await db
    .select({
      emailSnapshot: profiles.emailSnapshot,
      username: profiles.username,
    })
    .from(profiles)
    .where(eq(profiles.id, plan.userId))
    .limit(1);
  if (!profile) return null;

  const [order] = plan.orderId
    ? await db
        .select({
          orderNumber: orders.orderNumber,
          totalSatang: orders.totalSatang,
        })
        .from(orders)
        .where(
          and(
            eq(orders.id, plan.orderId),
            eq(orders.userId, plan.userId),
          ),
        )
        .limit(1)
    : [];
  const [product] = plan.productId
    ? await db
        .select({ name: products.name })
        .from(products)
        .where(eq(products.id, plan.productId))
        .limit(1)
    : [];
  const recipient = deliverableEmailSchema.safeParse(
    profile.emailSnapshot,
  );

  return {
    orderNumber: plan.orderNumber ?? order?.orderNumber ?? null,
    productName: product?.name ?? null,
    recipient: recipient.success ? recipient.data : null,
    totalSatang: order?.totalSatang ?? null,
    username: profile.username,
    version: plan.version,
  };
}
