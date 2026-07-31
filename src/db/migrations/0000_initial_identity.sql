CREATE TYPE "public"."customer_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TABLE "admin_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "admin_permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "admin_user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"email_snapshot" text,
	"discord_user_id" text,
	"discord_username" text,
	"discord_avatar_url" text,
	"customer_status" "customer_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_discord_user_id_unique" UNIQUE("discord_user_id")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_role_id_admin_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_admin_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_admin_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."admin_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_auth_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
