import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { products, skus } from "./catalog";
import { orders } from "./commerce";
import { profiles } from "./identity";

export const webhookProvider = pgEnum("webhook_provider", [
  "stripe",
  "qstash",
]);

export const webhookProcessingStatus = pgEnum(
  "webhook_processing_status",
  ["received", "processing", "processed", "failed", "ignored"],
);

export const outboxStatus = pgEnum("outbox_status", [
  "pending",
  "dispatched",
  "completed",
  "failed",
]);

export const discordSyncAction = pgEnum("discord_sync_action", [
  "add_role",
  "remove_role",
  "join_guild",
  "full_sync",
]);

export const discordSyncStatus = pgEnum("discord_sync_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const reviewStatus = pgEnum("review_status", [
  "pending",
  "published",
  "rejected",
]);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: webhookProvider("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    payloadHash: text("payload_hash").notNull(),
    processingStatus: webhookProcessingStatus("processing_status")
      .default("received")
      .notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    lastError: text("last_error"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    unique("webhook_events_provider_event_unique").on(
      table.provider,
      table.providerEventId,
    ),
    index("webhook_events_processing_status_received_at_idx").on(
      table.processingStatus,
      table.receivedAt,
    ),
    check(
      "webhook_events_attempt_count_nonnegative",
      sql`${table.attemptCount} >= 0`,
    ),
  ],
).enableRLS();

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    topic: text("topic").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    dedupeKey: text("dedupe_key").unique(),
    payload: jsonb("payload").notNull(),
    status: outboxStatus("status").default("pending").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastError: text("last_error"),
    providerMessageId: text("provider_message_id"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("outbox_events_status_available_at_idx").on(
      table.status,
      table.availableAt,
    ),
    index("outbox_events_aggregate_idx").on(
      table.aggregateType,
      table.aggregateId,
    ),
    check(
      "outbox_events_attempt_count_nonnegative",
      sql`${table.attemptCount} >= 0`,
    ),
  ],
).enableRLS();

export const discordRoleMappings = pgTable(
  "discord_role_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    skuId: uuid("sku_id").references(() => skus.id),
    productId: uuid("product_id").references(() => products.id),
    discordGuildId: text("discord_guild_id").notNull(),
    discordRoleId: text("discord_role_id").notNull(),
    discordRoleName: text("discord_role_name").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("discord_role_mappings_sku_id_idx").on(table.skuId),
    index("discord_role_mappings_product_id_idx").on(table.productId),
    index("discord_role_mappings_guild_role_idx").on(
      table.discordGuildId,
      table.discordRoleId,
    ),
    uniqueIndex("discord_role_mappings_product_role_unique")
      .on(table.discordGuildId, table.discordRoleId, table.productId)
      .where(
        sql`${table.productId} is not null and ${table.isActive} = true`,
      ),
    uniqueIndex("discord_role_mappings_sku_role_unique")
      .on(table.discordGuildId, table.discordRoleId, table.skuId)
      .where(sql`${table.skuId} is not null and ${table.isActive} = true`),
    check(
      "discord_role_mappings_single_source",
      sql`num_nonnulls(${table.skuId}, ${table.productId}) = 1`,
    ),
  ],
).enableRLS();

export const discordSyncJobs = pgTable(
  "discord_sync_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    action: discordSyncAction("action").notNull(),
    status: discordSyncStatus("status").default("pending").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    lastError: text("last_error"),
    availableAt: timestamp("available_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("discord_sync_jobs_user_id_idx").on(table.userId),
    index("discord_sync_jobs_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    index("discord_sync_jobs_status_available_at_idx").on(
      table.status,
      table.availableAt,
    ),
    uniqueIndex("discord_sync_jobs_active_user_unique")
      .on(table.userId)
      .where(sql`${table.status} in ('pending', 'running')`),
    check(
      "discord_sync_jobs_attempt_count_nonnegative",
      sql`${table.attemptCount} >= 0`,
    ),
  ],
).enableRLS();

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    rating: smallint("rating").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    status: reviewStatus("status").default("pending").notNull(),
    isVerifiedPurchase: boolean("is_verified_purchase")
      .default(false)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("reviews_user_id_product_id_unique").on(
      table.userId,
      table.productId,
    ),
    index("reviews_product_id_status_created_at_idx").on(
      table.productId,
      table.status,
      table.createdAt,
    ),
    index("reviews_order_id_idx").on(table.orderId),
    check("reviews_rating_range", sql`${table.rating} between 1 and 5`),
    pgPolicy("reviews_select_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`${table.status} = 'published'`,
    }),
    pgPolicy("reviews_select_own", {
      for: "select",
      to: "authenticated",
      using: sql`(select auth.uid()) = ${table.userId}`,
    }),
  ],
).enableRLS();
