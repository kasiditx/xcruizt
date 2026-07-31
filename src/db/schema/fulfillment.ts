import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { files, products } from "./catalog";
import { orders } from "./commerce";
import { profiles } from "./identity";

export const entitlementSourceType = pgEnum("entitlement_source_type", [
  "order",
  "manual",
  "legacy_import",
  "promotion",
]);

export const entitlementStatus = pgEnum("entitlement_status", [
  "active",
  "revoked",
]);

export const downloadResult = pgEnum("download_result", [
  "allowed",
  "denied",
  "rate_limited",
  "file_missing",
]);

export const entitlements = pgTable(
  "entitlements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    sourceOrderId: uuid("source_order_id").references(() => orders.id),
    sourceType: entitlementSourceType("source_type").notNull(),
    status: entitlementStatus("status").default("active").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),
  },
  (table) => [
    unique("entitlements_user_product_source_order_unique").on(
      table.userId,
      table.productId,
      table.sourceOrderId,
    ),
    uniqueIndex("entitlements_active_owner_unique")
      .on(table.userId, table.productId)
      .where(sql`${table.status} = 'active'`),
    index("entitlements_user_id_idx").on(table.userId),
    index("entitlements_product_id_idx").on(table.productId),
    index("entitlements_source_order_id_idx").on(table.sourceOrderId),
    pgPolicy("entitlements_select_own", {
      for: "select",
      to: "authenticated",
      using: sql`(select auth.uid()) = ${table.userId}`,
    }),
  ],
).enableRLS();

export const downloadEvents = pgTable(
  "download_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    entitlementId: uuid("entitlement_id")
      .notNull()
      .references(() => entitlements.id),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id),
    orderId: uuid("order_id").references(() => orders.id),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
    countryCode: text("country_code"),
    result: downloadResult("result").notNull(),
    denialReason: text("denial_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("download_events_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("download_events_entitlement_id_idx").on(table.entitlementId),
    index("download_events_file_id_idx").on(table.fileId),
    index("download_events_order_id_idx").on(table.orderId),
    index("download_events_result_created_at_idx").on(
      table.result,
      table.createdAt,
    ),
  ],
).enableRLS();
