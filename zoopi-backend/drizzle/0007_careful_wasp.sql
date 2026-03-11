ALTER TABLE "companies" ADD COLUMN "plan_type" varchar(50);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "plan_status" varchar(50);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "role" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "global_role" varchar(50);