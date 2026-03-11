CREATE TYPE "public"."product_type" AS ENUM('simple', 'pizza', 'combo');--> statement-breakpoint
CREATE TYPE "public"."tax_regime" AS ENUM('simples_nacional', 'simples_nacional_excesso', 'lucro_presumido', 'lucro_real');--> statement-breakpoint
CREATE TABLE "product_options_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"min_qty" integer DEFAULT 0 NOT NULL,
	"max_qty" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_options_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "product_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"label" varchar(50) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"delivery_price" numeric(10, 2),
	"order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "products_to_options_groups" (
	"product_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"order" integer DEFAULT 0,
	CONSTRAINT "products_to_options_groups_product_id_group_id_pk" PRIMARY KEY("product_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "fiscal_certificates" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fiscal_configurations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoices" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tax_rules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "fiscal_certificates" CASCADE;--> statement-breakpoint
DROP TABLE "fiscal_configurations" CASCADE;--> statement-breakpoint
DROP TABLE "invoices" CASCADE;--> statement-breakpoint
DROP TABLE "tax_rules" CASCADE;--> statement-breakpoint
DROP TYPE "public"."invoice_type";--> statement-breakpoint
CREATE TYPE "public"."invoice_type" AS ENUM('nfe', 'nfce', 'nfse');--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "ncm" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "cest" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_tax_id" varchar(20);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "type" "product_type" DEFAULT 'simple' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_options_groups" ADD CONSTRAINT "product_options_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options_items" ADD CONSTRAINT "product_options_items_group_id_product_options_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."product_options_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_to_options_groups" ADD CONSTRAINT "products_to_options_groups_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_to_options_groups" ADD CONSTRAINT "products_to_options_groups_group_id_product_options_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."product_options_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "cnpj";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "ie";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "im";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "crt";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "customer_document";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "price";--> statement-breakpoint
DROP TYPE "public"."fiscal_environment";