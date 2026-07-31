import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDirectory = join(process.cwd(), "src/db/migrations");

function readCommerceMigration() {
  const fileName = readdirSync(migrationsDirectory).find((entry) =>
    entry.endsWith("_complete_commerce_schema.sql"),
  );

  if (!fileName) {
    throw new Error("Complete commerce migration was not generated.");
  }

  return readFileSync(join(migrationsDirectory, fileName), "utf8");
}

describe("complete commerce migration", () => {
  it("creates all 20 commerce tables missing from the identity foundation", () => {
    const sql = readCommerceMigration();
    const expectedTables = [
      "collections",
      "products",
      "skus",
      "sku_products",
      "product_versions",
      "files",
      "product_images",
      "orders",
      "order_items",
      "payments",
      "refunds",
      "entitlements",
      "download_events",
      "coupons",
      "coupon_redemptions",
      "webhook_events",
      "outbox_events",
      "discord_role_mappings",
      "discord_sync_jobs",
      "reviews",
    ];

    for (const table of expectedTables) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    }
    expect(sql.match(/CREATE TABLE "/g)).toHaveLength(expectedTables.length);
  });

  it("enables RLS on every newly created public table", () => {
    const sql = readCommerceMigration();
    const createdTables = [
      ...sql.matchAll(/CREATE TABLE "([^"]+)"/g),
    ].map((match) => match[1]);

    for (const table of createdTables) {
      expect(sql).toMatch(
        new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`, "i"),
      );
    }
  });

  it("adds owner-scoped policies without exposing sensitive tables", () => {
    const sql = readCommerceMigration();

    expect(sql).toContain('CREATE POLICY "orders_select_own"');
    expect(sql).toContain('CREATE POLICY "order_items_select_own"');
    expect(sql).toContain('CREATE POLICY "entitlements_select_own"');
    expect(sql).toMatch(/auth\.uid\(\).*"orders"\."user_id"/is);
    expect(sql).toMatch(/auth\.uid\(\).*"entitlements"\."user_id"/is);

    for (const table of [
      "files",
      "payments",
      "refunds",
      "download_events",
      "coupons",
      "coupon_redemptions",
      "webhook_events",
      "outbox_events",
      "discord_role_mappings",
      "discord_sync_jobs",
    ]) {
      expect(sql).not.toMatch(
        new RegExp(`CREATE POLICY "[^"]+" ON "${table}"`, "i"),
      );
    }
  });

  it("enforces idempotency and ownership uniqueness", () => {
    const sql = readCommerceMigration();

    expect(sql).toContain(
      'CONSTRAINT "webhook_events_provider_event_unique" UNIQUE("provider","provider_event_id")',
    );
    expect(sql).toContain(
      'CREATE UNIQUE INDEX "entitlements_active_owner_unique"',
    );
    expect(sql).toMatch(
      /entitlements_active_owner_unique.*WHERE .*"status" = 'active'/i,
    );
    expect(sql).toContain(
      'CONSTRAINT "orders_provider_checkout_session_id_unique" UNIQUE("provider_checkout_session_id")',
    );
    expect(sql).toContain(
      'CREATE UNIQUE INDEX "coupons_code_unique" ON "coupons" USING btree (lower("code"))',
    );
  });

  it("adds critical monetary and content integrity checks", () => {
    const sql = readCommerceMigration();

    for (const constraint of [
      "skus_price_satang_nonnegative",
      "orders_total_matches_amounts",
      "order_items_subtotal_matches_quantity",
      "payments_amount_positive",
      "refunds_amount_positive",
      "coupons_discount_value_valid",
      "files_sha256_format",
      "reviews_rating_range",
    ]) {
      expect(sql).toContain(`CONSTRAINT "${constraint}" CHECK`);
    }
  });

  it("indexes foreign-key and asynchronous worker lookup paths", () => {
    const sql = readCommerceMigration();

    for (const indexName of [
      "products_collection_id_idx",
      "sku_products_product_id_idx",
      "files_product_version_id_idx",
      "orders_user_id_created_at_idx",
      "order_items_order_id_idx",
      "payments_order_id_idx",
      "entitlements_source_order_id_idx",
      "download_events_entitlement_id_idx",
      "webhook_events_processing_status_received_at_idx",
      "outbox_events_status_available_at_idx",
      "discord_sync_jobs_status_created_at_idx",
      "reviews_product_id_status_created_at_idx",
    ]) {
      expect(sql).toContain(`CREATE INDEX "${indexName}"`);
    }
  });
});
