CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_admin_user_id_created_at_idx" ON "admin_audit_logs" USING btree ("admin_user_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");