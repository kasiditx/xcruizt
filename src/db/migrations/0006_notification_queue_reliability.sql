ALTER TABLE "discord_sync_jobs" ADD COLUMN "available_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "discord_sync_jobs" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discord_sync_jobs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "provider_message_id" text;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "discord_sync_jobs_status_available_at_idx" ON "discord_sync_jobs" USING btree ("status","available_at");--> statement-breakpoint
WITH ranked_active_jobs AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "user_id"
		ORDER BY "created_at", "id"
	) AS "queue_position"
	FROM "discord_sync_jobs"
	WHERE "status" IN ('pending', 'running')
)
UPDATE "discord_sync_jobs"
SET
	"status" = 'failed',
	"last_error" = 'superseded_by_queue_constraint',
	"completed_at" = now(),
	"updated_at" = now()
WHERE "id" IN (
	SELECT "id"
	FROM ranked_active_jobs
	WHERE "queue_position" > 1
);--> statement-breakpoint
CREATE UNIQUE INDEX "discord_sync_jobs_active_user_unique" ON "discord_sync_jobs" USING btree ("user_id") WHERE "discord_sync_jobs"."status" in ('pending', 'running');--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_dedupe_key_unique" UNIQUE("dedupe_key");
