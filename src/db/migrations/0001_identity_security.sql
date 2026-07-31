ALTER TABLE "admin_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "admin_user_roles_role_id_idx" ON "admin_user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE POLICY "profiles_select_own" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "profiles"."id");