CREATE TYPE "public"."catalog_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."file_role" AS ENUM('main_package', 'installer', 'guide', 'checksum', 'extra');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('staging', 'active', 'quarantined', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."grant_policy" AS ENUM('permanent');--> statement-breakpoint
CREATE TYPE "public"."image_role" AS ENUM('cover', 'gallery', 'before', 'after', 'og', 'thumbnail');--> statement-breakpoint
CREATE TYPE "public"."product_version_status" AS ENUM('draft', 'published', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."sku_status" AS ENUM('draft', 'active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."sku_type" AS ENUM('single', 'collection', 'bundle');--> statement-breakpoint
CREATE TYPE "public"."storage_provider" AS ENUM('r2');--> statement-breakpoint
CREATE TYPE "public"."coupon_status" AS ENUM('draft', 'active', 'paused', 'expired');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'processing', 'paid', 'failed', 'expired', 'cancelled', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('stripe');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."download_result" AS ENUM('allowed', 'denied', 'rate_limited', 'file_missing');--> statement-breakpoint
CREATE TYPE "public"."entitlement_source_type" AS ENUM('order', 'manual', 'legacy_import', 'promotion');--> statement-breakpoint
CREATE TYPE "public"."entitlement_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."discord_sync_action" AS ENUM('add_role', 'remove_role', 'join_guild', 'full_sync');--> statement-breakpoint
CREATE TYPE "public"."discord_sync_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'dispatched', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."webhook_processing_status" AS ENUM('received', 'processing', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."webhook_provider" AS ENUM('stripe', 'qstash');--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"tagline" text,
	"description" text NOT NULL,
	"accent_key" text,
	"cover_image_id" uuid,
	"status" "catalog_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug"),
	CONSTRAINT "collections_sort_order_nonnegative" CHECK ("collections"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "collections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_version_id" uuid NOT NULL,
	"file_role" "file_role" NOT NULL,
	"storage_provider" "storage_provider" DEFAULT 'r2' NOT NULL,
	"storage_bucket" text NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"content_type" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"sha256" text NOT NULL,
	"status" "file_status" DEFAULT 'staging' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "files_file_size_bytes_nonnegative" CHECK ("files"."file_size_bytes" >= 0),
	CONSTRAINT "files_sha256_format" CHECK ("files"."sha256" ~ '^[0-9a-fA-F]{64}$')
);
--> statement-breakpoint
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"collection_id" uuid,
	"image_role" "image_role" NOT NULL,
	"storage_url" text NOT NULL,
	"alt_text" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"blur_data_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_schema_image" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_single_owner" CHECK (num_nonnulls("product_images"."product_id", "product_images"."collection_id") = 1),
	CONSTRAINT "product_images_width_positive" CHECK ("product_images"."width" > 0),
	CONSTRAINT "product_images_height_positive" CHECK ("product_images"."height" > 0),
	CONSTRAINT "product_images_sort_order_nonnegative" CHECK ("product_images"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"version" text NOT NULL,
	"status" "product_version_status" DEFAULT 'draft' NOT NULL,
	"changelog_md" text NOT NULL,
	"release_notes_md" text,
	"is_current" boolean DEFAULT false NOT NULL,
	"released_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_versions_product_id_version_unique" UNIQUE("product_id","version")
);
--> statement-breakpoint
ALTER TABLE "product_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"short_description" text NOT NULL,
	"description" text NOT NULL,
	"mood" text,
	"compatibility" jsonb NOT NULL,
	"status" "catalog_status" DEFAULT 'draft' NOT NULL,
	"brand_name" text DEFAULT 'XCRUIZT' NOT NULL,
	"schema_category" text NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"canonical_path" text,
	"is_indexable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sku_products" (
	"sku_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"grant_policy" "grant_policy" DEFAULT 'permanent' NOT NULL,
	CONSTRAINT "sku_products_sku_id_product_id_pk" PRIMARY KEY("sku_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "sku_products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "skus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_code" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sku_type" "sku_type" NOT NULL,
	"price_satang" integer NOT NULL,
	"compare_at_price_satang" integer,
	"currency" char(3) DEFAULT 'THB' NOT NULL,
	"status" "sku_status" DEFAULT 'draft' NOT NULL,
	"purchase_limit" integer,
	"stripe_price_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skus_sku_code_unique" UNIQUE("sku_code"),
	CONSTRAINT "skus_slug_unique" UNIQUE("slug"),
	CONSTRAINT "skus_price_satang_nonnegative" CHECK ("skus"."price_satang" >= 0),
	CONSTRAINT "skus_compare_at_price_satang_nonnegative" CHECK ("skus"."compare_at_price_satang" is null or "skus"."compare_at_price_satang" >= 0),
	CONSTRAINT "skus_purchase_limit_positive" CHECK ("skus"."purchase_limit" is null or "skus"."purchase_limit" > 0)
);
--> statement-breakpoint
ALTER TABLE "skus" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"discount_satang" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_redemptions_coupon_id_order_id_unique" UNIQUE("coupon_id","order_id"),
	CONSTRAINT "coupon_redemptions_discount_nonnegative" CHECK ("coupon_redemptions"."discount_satang" >= 0)
);
--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"minimum_amount_satang" integer,
	"maximum_discount_satang" integer,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"usage_limit" integer,
	"per_user_limit" integer,
	"status" "coupon_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_discount_value_valid" CHECK ("coupons"."discount_value" > 0 and ("coupons"."discount_type" <> 'percent' or "coupons"."discount_value" <= 100)),
	CONSTRAINT "coupons_minimum_amount_nonnegative" CHECK ("coupons"."minimum_amount_satang" is null or "coupons"."minimum_amount_satang" >= 0),
	CONSTRAINT "coupons_maximum_discount_nonnegative" CHECK ("coupons"."maximum_discount_satang" is null or "coupons"."maximum_discount_satang" >= 0),
	CONSTRAINT "coupons_date_window_valid" CHECK ("coupons"."ends_at" > "coupons"."starts_at"),
	CONSTRAINT "coupons_usage_limit_positive" CHECK ("coupons"."usage_limit" is null or "coupons"."usage_limit" > 0),
	CONSTRAINT "coupons_per_user_limit_positive" CHECK ("coupons"."per_user_limit" is null or "coupons"."per_user_limit" > 0)
);
--> statement-breakpoint
ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"sku_id" uuid NOT NULL,
	"sku_code_snapshot" text NOT NULL,
	"product_name_snapshot" text NOT NULL,
	"unit_price_satang" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_subtotal_satang" integer NOT NULL,
	"discount_satang" integer NOT NULL,
	"line_total_satang" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_amounts_nonnegative" CHECK ("order_items"."unit_price_satang" >= 0 and "order_items"."line_subtotal_satang" >= 0 and "order_items"."discount_satang" >= 0 and "order_items"."line_total_satang" >= 0),
	CONSTRAINT "order_items_subtotal_matches_quantity" CHECK ("order_items"."line_subtotal_satang" = "order_items"."unit_price_satang" * "order_items"."quantity"),
	CONSTRAINT "order_items_discount_not_above_subtotal" CHECK ("order_items"."discount_satang" <= "order_items"."line_subtotal_satang"),
	CONSTRAINT "order_items_total_matches_amounts" CHECK ("order_items"."line_total_satang" = "order_items"."line_subtotal_satang" - "order_items"."discount_satang")
);
--> statement-breakpoint
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"subtotal_satang" integer NOT NULL,
	"discount_satang" integer NOT NULL,
	"total_satang" integer NOT NULL,
	"currency" char(3) DEFAULT 'THB' NOT NULL,
	"coupon_id" uuid,
	"payment_provider" "payment_provider" DEFAULT 'stripe' NOT NULL,
	"provider_checkout_session_id" text,
	"paid_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_provider_checkout_session_id_unique" UNIQUE("provider_checkout_session_id"),
	CONSTRAINT "orders_amounts_nonnegative" CHECK ("orders"."subtotal_satang" >= 0 and "orders"."discount_satang" >= 0 and "orders"."total_satang" >= 0),
	CONSTRAINT "orders_discount_not_above_subtotal" CHECK ("orders"."discount_satang" <= "orders"."subtotal_satang"),
	CONSTRAINT "orders_total_matches_amounts" CHECK ("orders"."total_satang" = "orders"."subtotal_satang" - "orders"."discount_satang")
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" "payment_provider" DEFAULT 'stripe' NOT NULL,
	"provider_payment_intent_id" text,
	"provider_checkout_session_id" text,
	"amount_satang" integer NOT NULL,
	"currency" char(3) DEFAULT 'THB' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"raw_status" text,
	"payment_method_type" text,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_satang" > 0)
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"provider_refund_id" text NOT NULL,
	"amount_satang" integer NOT NULL,
	"reason" text,
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"requested_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_provider_refund_id_unique" UNIQUE("provider_refund_id"),
	CONSTRAINT "refunds_amount_positive" CHECK ("refunds"."amount_satang" > 0)
);
--> statement-breakpoint
ALTER TABLE "refunds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "download_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entitlement_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"order_id" uuid,
	"ip_hash" text,
	"user_agent_hash" text,
	"country_code" text,
	"result" "download_result" NOT NULL,
	"denial_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "download_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"source_order_id" uuid,
	"source_type" "entitlement_source_type" NOT NULL,
	"status" "entitlement_status" DEFAULT 'active' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	CONSTRAINT "entitlements_user_product_source_order_unique" UNIQUE("user_id","product_id","source_order_id")
);
--> statement-breakpoint
ALTER TABLE "entitlements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "discord_role_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_id" uuid,
	"product_id" uuid,
	"discord_guild_id" text NOT NULL,
	"discord_role_id" text NOT NULL,
	"discord_role_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discord_role_mappings_single_source" CHECK (num_nonnulls("discord_role_mappings"."sku_id", "discord_role_mappings"."product_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "discord_role_mappings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "discord_sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" "discord_sync_action" NOT NULL,
	"status" "discord_sync_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "discord_sync_jobs_attempt_count_nonnegative" CHECK ("discord_sync_jobs"."attempt_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "discord_sync_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_events_attempt_count_nonnegative" CHECK ("outbox_events"."attempt_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"is_verified_purchase" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_user_id_product_id_unique" UNIQUE("user_id","product_id"),
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "webhook_provider" NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload_hash" text NOT NULL,
	"processing_status" "webhook_processing_status" DEFAULT 'received' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "webhook_events_provider_event_unique" UNIQUE("provider","provider_event_id"),
	CONSTRAINT "webhook_events_attempt_count_nonnegative" CHECK ("webhook_events"."attempt_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_cover_image_id_product_images_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."product_images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_product_version_id_product_versions_id_fk" FOREIGN KEY ("product_version_id") REFERENCES "public"."product_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_versions" ADD CONSTRAINT "product_versions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_versions" ADD CONSTRAINT "product_versions_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_products" ADD CONSTRAINT "sku_products_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_products" ADD CONSTRAINT "sku_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_entitlement_id_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."entitlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_source_order_id_orders_id_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_role_mappings" ADD CONSTRAINT "discord_role_mappings_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_role_mappings" ADD CONSTRAINT "discord_role_mappings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_sync_jobs" ADD CONSTRAINT "discord_sync_jobs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collections_cover_image_id_idx" ON "collections" USING btree ("cover_image_id");--> statement-breakpoint
CREATE INDEX "collections_status_sort_order_idx" ON "collections" USING btree ("status","sort_order");--> statement-breakpoint
CREATE INDEX "files_product_version_id_idx" ON "files" USING btree ("product_version_id");--> statement-breakpoint
CREATE INDEX "files_status_idx" ON "files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_images_product_id_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_images_collection_id_idx" ON "product_images" USING btree ("collection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_versions_current_product_unique" ON "product_versions" USING btree ("product_id") WHERE "product_versions"."is_current" = true;--> statement-breakpoint
CREATE INDEX "product_versions_created_by_idx" ON "product_versions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "product_versions_status_released_at_idx" ON "product_versions" USING btree ("status","released_at");--> statement-breakpoint
CREATE INDEX "products_collection_id_idx" ON "products" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "products_status_published_at_idx" ON "products" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "sku_products_product_id_idx" ON "sku_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "skus_status_idx" ON "skus" USING btree ("status");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_user_id_idx" ON "coupon_redemptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_order_id_idx" ON "coupon_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_code_unique" ON "coupons" USING btree (lower("code"));--> statement-breakpoint
CREATE INDEX "coupons_status_starts_at_ends_at_idx" ON "coupons" USING btree ("status","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_sku_id_idx" ON "order_items" USING btree ("sku_id");--> statement-breakpoint
CREATE INDEX "orders_user_id_created_at_idx" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_coupon_id_idx" ON "orders" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "orders_status_created_at_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_provider_payment_intent_id_idx" ON "payments" USING btree ("provider_payment_intent_id");--> statement-breakpoint
CREATE INDEX "payments_provider_checkout_session_id_idx" ON "payments" USING btree ("provider_checkout_session_id");--> statement-breakpoint
CREATE INDEX "payments_status_created_at_idx" ON "payments" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "refunds_payment_id_idx" ON "refunds" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "refunds_requested_by_idx" ON "refunds" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "refunds_status_created_at_idx" ON "refunds" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "download_events_user_id_created_at_idx" ON "download_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "download_events_entitlement_id_idx" ON "download_events" USING btree ("entitlement_id");--> statement-breakpoint
CREATE INDEX "download_events_file_id_idx" ON "download_events" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "download_events_order_id_idx" ON "download_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "download_events_result_created_at_idx" ON "download_events" USING btree ("result","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_active_owner_unique" ON "entitlements" USING btree ("user_id","product_id") WHERE "entitlements"."status" = 'active';--> statement-breakpoint
CREATE INDEX "entitlements_user_id_idx" ON "entitlements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entitlements_product_id_idx" ON "entitlements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "entitlements_source_order_id_idx" ON "entitlements" USING btree ("source_order_id");--> statement-breakpoint
CREATE INDEX "discord_role_mappings_sku_id_idx" ON "discord_role_mappings" USING btree ("sku_id");--> statement-breakpoint
CREATE INDEX "discord_role_mappings_product_id_idx" ON "discord_role_mappings" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "discord_role_mappings_guild_role_idx" ON "discord_role_mappings" USING btree ("discord_guild_id","discord_role_id");--> statement-breakpoint
CREATE INDEX "discord_sync_jobs_user_id_idx" ON "discord_sync_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "discord_sync_jobs_status_created_at_idx" ON "discord_sync_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "outbox_events_aggregate_idx" ON "outbox_events" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "reviews_product_id_status_created_at_idx" ON "reviews" USING btree ("product_id","status","created_at");--> statement-breakpoint
CREATE INDEX "reviews_order_id_idx" ON "reviews" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "webhook_events_processing_status_received_at_idx" ON "webhook_events" USING btree ("processing_status","received_at");--> statement-breakpoint
CREATE POLICY "order_items_select_own" ON "order_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1
        from "orders"
        where "orders"."id" = "order_items"."order_id"
          and "orders"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "orders_select_own" ON "orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "orders"."user_id");--> statement-breakpoint
CREATE POLICY "entitlements_select_own" ON "entitlements" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "entitlements"."user_id");--> statement-breakpoint
CREATE POLICY "reviews_select_published" ON "reviews" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("reviews"."status" = 'published');--> statement-breakpoint
CREATE POLICY "reviews_select_own" ON "reviews" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "reviews"."user_id");