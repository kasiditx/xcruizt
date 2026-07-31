import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const customerStatus = pgEnum("customer_status", [
  "active",
  "suspended",
]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    username: text("username").notNull().unique(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    emailSnapshot: text("email_snapshot"),
    discordUserId: text("discord_user_id").unique(),
    discordUsername: text("discord_username"),
    discordAvatarUrl: text("discord_avatar_url"),
    customerStatus: customerStatus("customer_status")
      .default("active")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    pgPolicy("profiles_select_own", {
      for: "select",
      to: "authenticated",
      using: sql`(select auth.uid()) = ${table.id}`,
    }),
  ],
).enableRLS();

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminUserId: uuid("admin_user_id").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    beforeData: jsonb("before_data"),
    afterData: jsonb("after_data"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("admin_audit_logs_admin_user_id_created_at_idx").on(
      table.adminUserId,
      table.createdAt,
    ),
    index("admin_audit_logs_created_at_idx").on(table.createdAt),
  ],
).enableRLS();

export const adminRoles = pgTable("admin_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}).enableRLS();

export const adminPermissions = pgTable("admin_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
}).enableRLS();

export const adminUserRoles = pgTable(
  "admin_user_roles",
  {
    userId: uuid("user_id").notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => adminRoles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index("admin_user_roles_role_id_idx").on(table.roleId),
  ],
).enableRLS();

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => adminRoles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => adminPermissions.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index("role_permissions_permission_id_idx").on(table.permissionId),
  ],
).enableRLS();
