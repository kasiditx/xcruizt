ALTER TABLE "orders" ADD COLUMN "checkout_request_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_request_id_unique" UNIQUE("checkout_request_id");