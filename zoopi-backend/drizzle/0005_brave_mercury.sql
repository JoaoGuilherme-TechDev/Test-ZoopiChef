CREATE TYPE "public"."table_event_status" AS ENUM('pending', 'attended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."table_event_type" AS ENUM('call_waiter', 'ask_bill');--> statement-breakpoint
CREATE TABLE "fiscal_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"base64_content" text NOT NULL,
	"password_encrypted" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fiscal_certificates_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "fiscal_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"cnpj" varchar(14) NOT NULL,
	"ie" varchar(20) NOT NULL,
	"im" varchar(20),
	"tax_regime" "tax_regime" DEFAULT 'simples_nacional' NOT NULL,
	"is_sandbox" boolean DEFAULT true NOT NULL,
	"csc_token" varchar(255),
	"csc_id" varchar(10),
	"certificate_expires_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fiscal_configs_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"type" "invoice_type" NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"customer_tax_id" varchar(20),
	"access_key" varchar(44),
	"invoice_number" integer,
	"series" integer,
	"xml_url" text,
	"pdf_url" text,
	"sefaz_message" text,
	"protocol" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "table_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"table_number" varchar(50) NOT NULL,
	"type" "table_event_type" NOT NULL,
	"status" "table_event_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"cfop" varchar(4) NOT NULL,
	"origin_uf" varchar(2) NOT NULL,
	"dest_uf" varchar(2) NOT NULL,
	"icms_cst" varchar(3) NOT NULL,
	"icms_orig" integer DEFAULT 0 NOT NULL,
	"icms_rate" numeric(5, 2) DEFAULT '0.00',
	"pis_cst" varchar(2),
	"pis_rate" numeric(5, 2) DEFAULT '0.00',
	"cofins_cst" varchar(2),
	"cofins_rate" numeric(5, 2) DEFAULT '0.00',
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "cnpj" varchar(14);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "ie" varchar(20);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "im" varchar(20);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "crt" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "display_on_tablet" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "fiscal_certificates" ADD CONSTRAINT "fiscal_certificates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_configs" ADD CONSTRAINT "fiscal_configs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_events" ADD CONSTRAINT "table_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;