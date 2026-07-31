import "server-only";

import { count, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import {
  discordSyncJobs,
  entitlements,
  orders,
  outboxEvents,
  payments,
  products,
  skus,
  webhookEvents,
} from "@/db/schema";

export type AdminDashboardSummary = {
  activeEntitlements: number;
  failedWebhooks: number;
  orders: number;
  payments: number;
  products: number;
  queuedDiscordJobs: number;
  queuedOutboxEvents: number;
  skus: number;
};

async function countRows(
  query: Promise<Array<{ value: number }>>,
): Promise<number> {
  const [result] = await query;
  return result?.value ?? 0;
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const [
    productCount,
    skuCount,
    orderCount,
    paymentCount,
    activeEntitlementCount,
    failedWebhookCount,
    queuedOutboxCount,
    queuedDiscordCount,
  ] = await Promise.all([
    countRows(db.select({ value: count() }).from(products)),
    countRows(db.select({ value: count() }).from(skus)),
    countRows(db.select({ value: count() }).from(orders)),
    countRows(db.select({ value: count() }).from(payments)),
    countRows(
      db
        .select({ value: count() })
        .from(entitlements)
        .where(eq(entitlements.status, "active")),
    ),
    countRows(
      db
        .select({ value: count() })
        .from(webhookEvents)
        .where(eq(webhookEvents.processingStatus, "failed")),
    ),
    countRows(
      db
        .select({ value: count() })
        .from(outboxEvents)
        .where(inArray(outboxEvents.status, ["pending", "failed"])),
    ),
    countRows(
      db
        .select({ value: count() })
        .from(discordSyncJobs)
        .where(inArray(discordSyncJobs.status, ["pending", "failed"])),
    ),
  ]);

  return {
    activeEntitlements: activeEntitlementCount,
    failedWebhooks: failedWebhookCount,
    orders: orderCount,
    payments: paymentCount,
    products: productCount,
    queuedDiscordJobs: queuedDiscordCount,
    queuedOutboxEvents: queuedOutboxCount,
    skus: skuCount,
  };
}
