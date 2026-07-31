import "server-only";

import {
  countDistinct,
  desc,
  eq,
} from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  downloadEvents,
  entitlements,
  orders,
  payments,
  products,
  profiles,
  refunds,
  webhookEvents,
} from "@/db/schema";

const ADMIN_LIST_LIMIT = 200;

export function listAdminOrders() {
  return db
    .select({
      createdAt: orders.createdAt,
      currency: orders.currency,
      discountSatang: orders.discountSatang,
      id: orders.id,
      orderNumber: orders.orderNumber,
      paidAt: orders.paidAt,
      providerCheckoutSessionId: orders.providerCheckoutSessionId,
      status: orders.status,
      subtotalSatang: orders.subtotalSatang,
      totalSatang: orders.totalSatang,
      username: profiles.username,
    })
    .from(orders)
    .innerJoin(profiles, eq(profiles.id, orders.userId))
    .orderBy(desc(orders.createdAt))
    .limit(ADMIN_LIST_LIMIT);
}

export function listAdminPayments() {
  return db
    .select({
      amountSatang: payments.amountSatang,
      createdAt: payments.createdAt,
      currency: payments.currency,
      id: payments.id,
      orderNumber: orders.orderNumber,
      paidAt: payments.paidAt,
      paymentMethodType: payments.paymentMethodType,
      providerCheckoutSessionId: payments.providerCheckoutSessionId,
      providerPaymentIntentId: payments.providerPaymentIntentId,
      rawStatus: payments.rawStatus,
      status: payments.status,
      username: profiles.username,
    })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(profiles, eq(profiles.id, orders.userId))
    .orderBy(desc(payments.createdAt))
    .limit(ADMIN_LIST_LIMIT);
}

export function listAdminCustomers() {
  return db
    .select({
      createdAt: profiles.createdAt,
      customerStatus: profiles.customerStatus,
      discordUsername: profiles.discordUsername,
      displayName: profiles.displayName,
      entitlementCount: countDistinct(entitlements.id),
      id: profiles.id,
      orderCount: countDistinct(orders.id),
      username: profiles.username,
    })
    .from(profiles)
    .leftJoin(orders, eq(orders.userId, profiles.id))
    .leftJoin(entitlements, eq(entitlements.userId, profiles.id))
    .groupBy(profiles.id)
    .orderBy(desc(profiles.createdAt))
    .limit(ADMIN_LIST_LIMIT);
}

export function listAdminEntitlements() {
  return db
    .select({
      grantedAt: entitlements.grantedAt,
      id: entitlements.id,
      orderNumber: orders.orderNumber,
      productName: products.name,
      revokedAt: entitlements.revokedAt,
      revokedReason: entitlements.revokedReason,
      sourceType: entitlements.sourceType,
      status: entitlements.status,
      username: profiles.username,
    })
    .from(entitlements)
    .innerJoin(profiles, eq(profiles.id, entitlements.userId))
    .innerJoin(products, eq(products.id, entitlements.productId))
    .leftJoin(orders, eq(orders.id, entitlements.sourceOrderId))
    .orderBy(desc(entitlements.grantedAt))
    .limit(ADMIN_LIST_LIMIT);
}

export async function listEntitlementGrantTargets() {
  const [customers, productRows] = await Promise.all([
    db
      .select({ id: profiles.id, username: profiles.username })
      .from(profiles)
      .where(eq(profiles.customerStatus, "active"))
      .orderBy(profiles.username),
    db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.status, "published"))
      .orderBy(products.name),
  ]);

  return { customers, products: productRows };
}

export function listAdminWebhookEvents() {
  return db
    .select({
      attemptCount: webhookEvents.attemptCount,
      eventType: webhookEvents.eventType,
      id: webhookEvents.id,
      lastError: webhookEvents.lastError,
      processedAt: webhookEvents.processedAt,
      processingStatus: webhookEvents.processingStatus,
      provider: webhookEvents.provider,
      providerEventId: webhookEvents.providerEventId,
      receivedAt: webhookEvents.receivedAt,
    })
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.receivedAt))
    .limit(ADMIN_LIST_LIMIT);
}

export function listAdminAuditLogs() {
  return db
    .select({
      action: adminAuditLogs.action,
      adminUsername: profiles.username,
      createdAt: adminAuditLogs.createdAt,
      entityId: adminAuditLogs.entityId,
      entityType: adminAuditLogs.entityType,
      id: adminAuditLogs.id,
    })
    .from(adminAuditLogs)
    .leftJoin(profiles, eq(profiles.id, adminAuditLogs.adminUserId))
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(ADMIN_LIST_LIMIT);
}

export function listAdminDownloads() {
  return db
    .select({
      createdAt: downloadEvents.createdAt,
      id: downloadEvents.id,
      productName: products.name,
      result: downloadEvents.result,
      username: profiles.username,
    })
    .from(downloadEvents)
    .innerJoin(profiles, eq(profiles.id, downloadEvents.userId))
    .innerJoin(entitlements, eq(entitlements.id, downloadEvents.entitlementId))
    .innerJoin(products, eq(products.id, entitlements.productId))
    .orderBy(desc(downloadEvents.createdAt))
    .limit(ADMIN_LIST_LIMIT);
}

export function listAdminRefunds() {
  return db
    .select({
      amountSatang: refunds.amountSatang,
      createdAt: refunds.createdAt,
      id: refunds.id,
      orderNumber: orders.orderNumber,
      providerRefundId: refunds.providerRefundId,
      reason: refunds.reason,
      status: refunds.status,
      username: profiles.username,
    })
    .from(refunds)
    .innerJoin(payments, eq(payments.id, refunds.paymentId))
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(profiles, eq(profiles.id, orders.userId))
    .orderBy(desc(refunds.createdAt))
    .limit(ADMIN_LIST_LIMIT);
}

export function listRefundablePayments() {
  return db
    .select({
      amountSatang: payments.amountSatang,
      id: payments.id,
      orderNumber: orders.orderNumber,
      username: profiles.username,
    })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(profiles, eq(profiles.id, orders.userId))
    .where(eq(payments.status, "succeeded"))
    .orderBy(desc(payments.createdAt))
    .limit(ADMIN_LIST_LIMIT);
}
