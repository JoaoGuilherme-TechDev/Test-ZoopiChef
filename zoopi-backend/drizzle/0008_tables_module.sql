-- ================================================================
-- FILE: zoopi-backend/drizzle/0008_tables_module.sql
-- ================================================================

CREATE TYPE "public"."restaurant_table_status" AS ENUM(
  'free',
  'occupied',
  'reserved',
  'no_consumption'
);
--> statement-breakpoint

CREATE TABLE "restaurant_tables" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "number" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "capacity" integer NOT NULL DEFAULT 4,
  "section" varchar(100),
  "status" "restaurant_table_status" NOT NULL DEFAULT 'free',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "restaurant_tables"
  ADD CONSTRAINT "restaurant_tables_company_id_companies_id_fk"
  FOREIGN KEY ("company_id")
  REFERENCES "public"."companies"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Garante que o número da mesa é único por empresa
ALTER TABLE "restaurant_tables"
  ADD CONSTRAINT "restaurant_tables_company_number_unique"
  UNIQUE("company_id", "number");