import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import * as schema from "./index";

const blueprintTables = {
  collections: "collections",
  products: "products",
  skus: "skus",
  skuProducts: "sku_products",
  productVersions: "product_versions",
  files: "files",
  productImages: "product_images",
  orders: "orders",
  orderItems: "order_items",
  payments: "payments",
  refunds: "refunds",
  entitlements: "entitlements",
  skuEntitlements: "sku_entitlements",
  downloadEvents: "download_events",
  coupons: "coupons",
  couponRedemptions: "coupon_redemptions",
  webhookEvents: "webhook_events",
  outboxEvents: "outbox_events",
  discordRoleMappings: "discord_role_mappings",
  discordSyncJobs: "discord_sync_jobs",
  reviews: "reviews",
} as const;

const blueprintColumns: Record<keyof typeof blueprintTables, string[]> = {
  collections: [
    "id",
    "name",
    "slug",
    "tagline",
    "description",
    "accent_key",
    "cover_image_id",
    "status",
    "sort_order",
    "seo_title",
    "seo_description",
    "created_at",
    "updated_at",
    "published_at",
  ],
  products: [
    "id",
    "collection_id",
    "name",
    "slug",
    "short_description",
    "description",
    "mood",
    "compatibility",
    "status",
    "brand_name",
    "schema_category",
    "seo_title",
    "seo_description",
    "canonical_path",
    "is_indexable",
    "created_at",
    "updated_at",
    "published_at",
  ],
  skus: [
    "id",
    "sku_code",
    "name",
    "slug",
    "sku_type",
    "price_satang",
    "compare_at_price_satang",
    "currency",
    "status",
    "purchase_limit",
    "stripe_price_id",
    "created_at",
    "updated_at",
  ],
  skuProducts: ["sku_id", "product_id", "grant_policy"],
  productVersions: [
    "id",
    "product_id",
    "version",
    "status",
    "changelog_md",
    "release_notes_md",
    "is_current",
    "released_at",
    "created_by",
    "created_at",
  ],
  files: [
    "id",
    "product_version_id",
    "sku_id",
    "file_role",
    "storage_provider",
    "storage_bucket",
    "storage_key",
    "original_filename",
    "content_type",
    "file_size_bytes",
    "sha256",
    "status",
    "created_at",
  ],
  skuEntitlements: [
    "id",
    "user_id",
    "sku_id",
    "source_order_id",
    "source_type",
    "status",
    "granted_at",
    "revoked_at",
    "revoked_reason",
  ],
  productImages: [
    "id",
    "product_id",
    "collection_id",
    "image_role",
    "storage_url",
    "alt_text",
    "width",
    "height",
    "blur_data_url",
    "sort_order",
    "is_schema_image",
    "created_at",
  ],
  orders: [
    "id",
    "order_number",
    "user_id",
    "status",
    "subtotal_satang",
    "discount_satang",
    "total_satang",
    "currency",
    "coupon_id",
    "payment_provider",
    "checkout_request_id",
    "provider_checkout_session_id",
    "paid_at",
    "expires_at",
    "created_at",
    "updated_at",
  ],
  orderItems: [
    "id",
    "order_id",
    "sku_id",
    "sku_code_snapshot",
    "product_name_snapshot",
    "unit_price_satang",
    "quantity",
    "line_subtotal_satang",
    "discount_satang",
    "line_total_satang",
    "metadata",
    "created_at",
  ],
  payments: [
    "id",
    "order_id",
    "provider",
    "provider_payment_intent_id",
    "provider_checkout_session_id",
    "amount_satang",
    "currency",
    "status",
    "raw_status",
    "payment_method_type",
    "paid_at",
    "refunded_at",
    "created_at",
    "updated_at",
  ],
  refunds: [
    "id",
    "payment_id",
    "provider_refund_id",
    "amount_satang",
    "reason",
    "status",
    "requested_by",
    "created_at",
    "updated_at",
  ],
  entitlements: [
    "id",
    "user_id",
    "product_id",
    "source_order_id",
    "source_type",
    "status",
    "granted_at",
    "revoked_at",
    "revoked_reason",
  ],
  downloadEvents: [
    "id",
    "user_id",
    "entitlement_id",
    "sku_entitlement_id",
    "file_id",
    "order_id",
    "ip_hash",
    "user_agent_hash",
    "country_code",
    "result",
    "denial_reason",
    "created_at",
  ],
  coupons: [
    "id",
    "code",
    "discount_type",
    "discount_value",
    "minimum_amount_satang",
    "maximum_discount_satang",
    "starts_at",
    "ends_at",
    "usage_limit",
    "per_user_limit",
    "status",
    "created_at",
    "updated_at",
  ],
  couponRedemptions: [
    "id",
    "coupon_id",
    "user_id",
    "order_id",
    "discount_satang",
    "created_at",
  ],
  webhookEvents: [
    "id",
    "provider",
    "provider_event_id",
    "event_type",
    "payload_hash",
    "processing_status",
    "attempt_count",
    "last_error",
    "received_at",
    "processed_at",
  ],
  outboxEvents: [
    "id",
    "topic",
    "aggregate_type",
    "aggregate_id",
    "dedupe_key",
    "payload",
    "status",
    "attempt_count",
    "available_at",
    "last_error",
    "provider_message_id",
    "completed_at",
    "created_at",
    "updated_at",
  ],
  discordRoleMappings: [
    "id",
    "sku_id",
    "product_id",
    "discord_guild_id",
    "discord_role_id",
    "discord_role_name",
    "is_active",
    "created_at",
  ],
  discordSyncJobs: [
    "id",
    "user_id",
    "action",
    "status",
    "attempt_count",
    "last_error",
    "available_at",
    "started_at",
    "created_at",
    "updated_at",
    "completed_at",
  ],
  reviews: [
    "id",
    "user_id",
    "product_id",
    "order_id",
    "rating",
    "title",
    "body",
    "status",
    "is_verified_purchase",
    "created_at",
    "updated_at",
  ],
};

const blueprintEnums = {
  catalogStatus: ["draft", "published", "archived"],
  skuType: ["single", "collection", "bundle"],
  skuStatus: ["draft", "active", "inactive", "archived"],
  grantPolicy: ["permanent"],
  productVersionStatus: ["draft", "published", "deprecated"],
  fileRole: ["main_package", "installer", "guide", "checksum", "extra"],
  storageProvider: ["r2"],
  fileStatus: ["staging", "active", "quarantined", "deleted"],
  imageRole: ["cover", "gallery", "before", "after", "og", "thumbnail"],
  orderStatus: [
    "pending",
    "processing",
    "paid",
    "failed",
    "expired",
    "cancelled",
    "refunded",
    "partially_refunded",
  ],
  paymentProvider: ["stripe"],
  paymentStatus: [
    "pending",
    "processing",
    "succeeded",
    "failed",
    "cancelled",
    "refunded",
    "partially_refunded",
  ],
  refundStatus: ["pending", "succeeded", "failed", "cancelled"],
  entitlementSourceType: [
    "order",
    "manual",
    "legacy_import",
    "promotion",
  ],
  entitlementStatus: ["active", "revoked"],
  downloadResult: ["allowed", "denied", "rate_limited", "file_missing"],
  discountType: ["percent", "fixed"],
  couponStatus: ["draft", "active", "paused", "expired"],
  webhookProvider: ["stripe", "qstash"],
  webhookProcessingStatus: [
    "received",
    "processing",
    "processed",
    "failed",
    "ignored",
  ],
  outboxStatus: ["pending", "dispatched", "completed", "failed"],
  discordSyncAction: ["add_role", "remove_role", "join_guild", "full_sync"],
  discordSyncStatus: ["pending", "running", "succeeded", "failed"],
  reviewStatus: ["pending", "published", "rejected"],
} as const;

describe("complete commerce database schema", () => {
  it("exports every commerce table required by the blueprint", () => {
    for (const [exportName, tableName] of Object.entries(blueprintTables)) {
      const table = Reflect.get(schema, exportName);

      expect(table, `${exportName} must be exported`).toBeDefined();
      expect(getTableConfig(table).name).toBe(tableName);
    }
  });

  it("defines every Blueprint column in its documented order", () => {
    for (const [exportName, expectedColumns] of Object.entries(
      blueprintColumns,
    )) {
      const table = Reflect.get(schema, exportName);
      const actualColumns = getTableConfig(table).columns.map(
        (column) => column.name,
      );

      expect(actualColumns, exportName).toEqual(expectedColumns);
    }
  });

  it("defines every Blueprint enum with only its approved values", () => {
    for (const [exportName, expectedValues] of Object.entries(blueprintEnums)) {
      const databaseEnum = Reflect.get(schema, exportName);

      expect(databaseEnum, `${exportName} must be exported`).toBeDefined();
      expect(databaseEnum.enumValues, exportName).toEqual(expectedValues);
    }
  });

  it("enables RLS on every commerce table", () => {
    for (const exportName of Object.keys(blueprintTables)) {
      const table = Reflect.get(schema, exportName);

      expect(getTableConfig(table).enableRLS, exportName).toBe(true);
    }
  });

  it("uses the Blueprint composite primary key for SKU grants", () => {
    const config = getTableConfig(schema.skuProducts);

    expect(config.primaryKeys).toHaveLength(1);
    expect(config.columns.some((column) => column.name === "id")).toBe(false);
  });

  it("protects active entitlement ownership with a partial unique index", () => {
    const indexNames = getTableConfig(schema.entitlements).indexes.map(
      (databaseIndex) => databaseIndex.config.name,
    );

    expect(indexNames).toContain("entitlements_active_owner_unique");
  });

  it("indexes required foreign-key and worker lookup paths", () => {
    const expectedIndexes = {
      products: ["products_collection_id_idx"],
      productVersions: ["product_versions_created_by_idx"],
      files: [
        "files_product_version_id_idx",
        "files_sku_id_idx",
        "files_sku_main_package_active_unique",
      ],
      productImages: [
        "product_images_product_id_idx",
        "product_images_collection_id_idx",
      ],
      orders: ["orders_user_id_created_at_idx", "orders_coupon_id_idx"],
      orderItems: ["order_items_order_id_idx", "order_items_sku_id_idx"],
      payments: ["payments_order_id_idx"],
      refunds: ["refunds_payment_id_idx", "refunds_requested_by_idx"],
      entitlements: [
        "entitlements_user_id_idx",
        "entitlements_product_id_idx",
        "entitlements_source_order_id_idx",
      ],
      downloadEvents: [
        "download_events_user_id_created_at_idx",
        "download_events_entitlement_id_idx",
        "download_events_sku_entitlement_id_idx",
        "download_events_file_id_idx",
        "download_events_order_id_idx",
      ],
      couponRedemptions: [
        "coupon_redemptions_user_id_idx",
        "coupon_redemptions_order_id_idx",
      ],
      webhookEvents: ["webhook_events_processing_status_received_at_idx"],
      outboxEvents: ["outbox_events_status_available_at_idx"],
      discordRoleMappings: [
        "discord_role_mappings_sku_id_idx",
        "discord_role_mappings_product_id_idx",
        "discord_role_mappings_product_role_unique",
        "discord_role_mappings_sku_role_unique",
      ],
      discordSyncJobs: [
        "discord_sync_jobs_user_id_idx",
        "discord_sync_jobs_status_created_at_idx",
        "discord_sync_jobs_status_available_at_idx",
        "discord_sync_jobs_active_user_unique",
      ],
      reviews: [
        "reviews_product_id_status_created_at_idx",
        "reviews_order_id_idx",
      ],
    } as const;

    for (const [exportName, requiredIndexNames] of Object.entries(
      expectedIndexes,
    )) {
      const table = Reflect.get(schema, exportName);
      const actualIndexNames = getTableConfig(table).indexes.map(
        (databaseIndex) => databaseIndex.config.name,
      );

      expect(actualIndexNames, exportName).toEqual(
        expect.arrayContaining([...requiredIndexNames]),
      );
    }
  });

  it("keeps sensitive operational tables without client policies", () => {
    for (const table of [
      schema.files,
      schema.payments,
      schema.refunds,
      schema.coupons,
      schema.couponRedemptions,
      schema.webhookEvents,
      schema.outboxEvents,
      schema.discordRoleMappings,
      schema.discordSyncJobs,
    ]) {
      expect(getTableConfig(table).policies).toHaveLength(0);
    }
  });

  it("limits customer records to owner-scoped select policies", () => {
    const expectedPolicyNames = {
      orders: ["orders_select_own"],
      orderItems: ["order_items_select_own"],
      entitlements: ["entitlements_select_own"],
      skuEntitlements: ["sku_entitlements_select_own"],
      downloadEvents: ["download_events_owner_select_own"],
    } as const;

    for (const [exportName, expectedNames] of Object.entries(
      expectedPolicyNames,
    )) {
      const table = Reflect.get(schema, exportName);
      const policies = getTableConfig(table).policies;

      expect(
        policies.map((policy) => policy.name),
        exportName,
      ).toEqual(expectedNames);
      expect(policies[0]).toMatchObject({
        for: "select",
        to: "authenticated",
      });
    }
  });
});
