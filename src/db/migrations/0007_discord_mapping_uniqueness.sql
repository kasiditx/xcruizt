WITH ranked_product_mappings AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "discord_guild_id", "discord_role_id", "product_id"
		ORDER BY "created_at", "id"
	) AS "mapping_position"
	FROM "discord_role_mappings"
	WHERE "product_id" IS NOT NULL AND "is_active" = true
)
UPDATE "discord_role_mappings"
SET "is_active" = false
WHERE "id" IN (
	SELECT "id" FROM ranked_product_mappings WHERE "mapping_position" > 1
);--> statement-breakpoint
WITH ranked_sku_mappings AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "discord_guild_id", "discord_role_id", "sku_id"
		ORDER BY "created_at", "id"
	) AS "mapping_position"
	FROM "discord_role_mappings"
	WHERE "sku_id" IS NOT NULL AND "is_active" = true
)
UPDATE "discord_role_mappings"
SET "is_active" = false
WHERE "id" IN (
	SELECT "id" FROM ranked_sku_mappings WHERE "mapping_position" > 1
);--> statement-breakpoint
CREATE UNIQUE INDEX "discord_role_mappings_product_role_unique" ON "discord_role_mappings" USING btree ("discord_guild_id","discord_role_id","product_id") WHERE "discord_role_mappings"."product_id" is not null and "discord_role_mappings"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "discord_role_mappings_sku_role_unique" ON "discord_role_mappings" USING btree ("discord_guild_id","discord_role_id","sku_id") WHERE "discord_role_mappings"."sku_id" is not null and "discord_role_mappings"."is_active" = true;
