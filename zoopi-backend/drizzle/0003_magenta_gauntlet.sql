CREATE TYPE "public"."fiscal_environment" AS ENUM('homologation', 'production');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'pending', 'authorized', 'cancelled', 'error', 'denied');--> statement-breakpoint
CREATE TYPE "public"."invoice_type" AS ENUM('nfe', 'nfce', 'nfse', 'cte');--> statement-breakpoint
CREATE TABLE "fiscal_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"base64_data" text NOT NULL,
	"password_encrypted" text NOT NULL,
	"thumbprint" varchar(255),
	"valid_until" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"certificate_id" uuid,
	"environment" "fiscal_environment" DEFAULT 'homologation' NOT NULL,
	"nfce_csc" varchar(100),
	"nfce_csc_id" varchar(10),
	"next_nfe_number" integer DEFAULT 1,
	"nfe_series" integer DEFAULT 1,
	"next_nfce_number" integer DEFAULT 1,
	"nfce_series" integer DEFAULT 1,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fiscal_configurations_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"order_id" uuid,
	"type" "invoice_type" NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"number" integer,
	"series" integer,
	"access_key" varchar(44),
	"xml_url" text,
	"pdf_url" text,
	"error_message" text,
	"protocol" varchar(100),
	"payload_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_access_key_unique" UNIQUE("access_key")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"order_number" integer NOT NULL,
	"customer_name" varchar(255),
	"customer_document" varchar(14),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"payment_method" varchar(50),
	"table_number" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"ncm" varchar(8) NOT NULL,
	"cfop" varchar(4) NOT NULL,
	"icms_cst" varchar(3) NOT NULL,
	"icms_orig" integer DEFAULT 0 NOT NULL,
	"icms_percent" numeric(5, 2) DEFAULT '0.00',
	"pis_cst" varchar(2),
	"cofins_cst" varchar(2),
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "cnpj" varchar(14);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "ie" varchar(20);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "im" varchar(20);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "crt" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "ncm" varchar(8);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cest" varchar(7);--> statement-breakpoint
ALTER TABLE "fiscal_certificates" ADD CONSTRAINT "fiscal_certificates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_configurations" ADD CONSTRAINT "fiscal_configurations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_configurations" ADD CONSTRAINT "fiscal_configurations_certificate_id_fiscal_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."fiscal_certificates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;