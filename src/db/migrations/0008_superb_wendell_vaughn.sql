CREATE TABLE "sku_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sku_id" uuid NOT NULL,
	"source_order_id" uuid,
	"source_type" "entitlement_source_type" NOT NULL,
	"status" "entitlement_status" DEFAULT 'active' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	CONSTRAINT "sku_entitlements_user_sku_source_order_unique" UNIQUE("user_id","sku_id","source_order_id")
);
--> statement-breakpoint
ALTER TABLE "sku_entitlements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "product_version_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "download_events" ALTER COLUMN "entitlement_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "sku_id" uuid;--> statement-breakpoint
ALTER TABLE "download_events" ADD COLUMN "sku_entitlement_id" uuid;--> statement-breakpoint
ALTER TABLE "sku_entitlements" ADD CONSTRAINT "sku_entitlements_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_entitlements" ADD CONSTRAINT "sku_entitlements_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_entitlements" ADD CONSTRAINT "sku_entitlements_source_order_id_orders_id_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sku_entitlements_active_owner_unique" ON "sku_entitlements" USING btree ("user_id","sku_id") WHERE "sku_entitlements"."status" = 'active';--> statement-breakpoint
CREATE INDEX "sku_entitlements_user_id_idx" ON "sku_entitlements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sku_entitlements_sku_id_idx" ON "sku_entitlements" USING btree ("sku_id");--> statement-breakpoint
CREATE INDEX "sku_entitlements_source_order_id_idx" ON "sku_entitlements" USING btree ("source_order_id");--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_sku_entitlement_id_sku_entitlements_id_fk" FOREIGN KEY ("sku_entitlement_id") REFERENCES "public"."sku_entitlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_sku_id_idx" ON "files" USING btree ("sku_id");--> statement-breakpoint
CREATE INDEX "download_events_sku_entitlement_id_idx" ON "download_events" USING btree ("sku_entitlement_id");--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_single_owner" CHECK (num_nonnulls("files"."product_version_id", "files"."sku_id") = 1);--> statement-breakpoint
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_single_entitlement" CHECK (num_nonnulls("download_events"."entitlement_id", "download_events"."sku_entitlement_id") = 1);--> statement-breakpoint
CREATE POLICY "download_events_owner_select_own" ON "download_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "download_events"."user_id");--> statement-breakpoint
CREATE POLICY "sku_entitlements_select_own" ON "sku_entitlements" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "sku_entitlements"."user_id");