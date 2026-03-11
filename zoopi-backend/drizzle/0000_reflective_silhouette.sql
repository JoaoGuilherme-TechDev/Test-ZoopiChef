CREATE TYPE "public"."waitlist_status" AS ENUM(
  'waiting',
  'notified', 
  'seated',
  'cancelled',
  'no_show'
);
CREATE TABLE "waitlist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "customer_name" varchar(255) NOT NULL,
  "customer_phone" varchar(30),
  "party_size" integer NOT NULL DEFAULT 1,
  "special_requests" text,
  "status" waitlist_status NOT NULL DEFAULT 'waiting',
  "assigned_table_id" uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  "notified_at" timestamp,
  "seated_at" timestamp,
  "requested_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"image_url" text,
	"color" varchar(20),
	"order" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"logo_url" text,
	"primary_color" varchar(20),
	"plan_type" varchar(50),
	"plan_status" varchar(50),
	"expires_at" timestamp,
	"cnpj" varchar(14),
	"ie" varchar(20),
	"im" varchar(20),
	"crt" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
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
	"customer_tax_id" varchar(20),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"payment_method" varchar(50),
	"table_number" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_options_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"min_qty" integer DEFAULT 0,
	"max_qty" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_options_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
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
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"subcategory_id" uuid,
	"category_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" "product_type" DEFAULT 'simple' NOT NULL,
	"image_url" text,
	"active" boolean DEFAULT true,
	"sku" varchar(100),
	"ncm" varchar(10),
	"cest" varchar(10),
	"display_name" varchar(255),
	"unit" varchar(50),
	"brand" varchar(100),
	"weight" varchar(50),
	"ean" varchar(20),
	"cost_price" numeric(10, 2),
	"profit_margin" numeric(5, 2),
	"sale_price" numeric(10, 2),
	"is_on_sale" boolean DEFAULT false NOT NULL,
	"wholesale_price" numeric(10, 2),
	"wholesale_min_qty" integer,
	"loyalty_points" integer DEFAULT 0,
	"enologist_notes" text,
	"featured" boolean DEFAULT false NOT NULL,
	"commission" boolean DEFAULT true NOT NULL,
	"production_location" varchar(100),
	"aparece_delivery" boolean DEFAULT true NOT NULL,
	"aparece_garcom" boolean DEFAULT true NOT NULL,
	"aparece_totem" boolean DEFAULT true NOT NULL,
	"aparece_tablet" boolean DEFAULT true NOT NULL,
	"aparece_mesa" boolean DEFAULT true NOT NULL,
	"aparece_comanda" boolean DEFAULT true NOT NULL,
	"aparece_tv" boolean DEFAULT true NOT NULL,
	"aparece_self_service" boolean DEFAULT true NOT NULL,
	"display_on_tablet" boolean DEFAULT true NOT NULL,
	"composition" text,
	"production_weight" varchar(50) DEFAULT '1.0',
	"is_weighted" boolean DEFAULT false NOT NULL,
	"tax_status" varchar(50) DEFAULT 'tributado',
	"internal_code" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products_to_options_groups" (
	"product_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"order" integer DEFAULT 0,
	"min_select" integer,
	"max_select" integer,
	"calc_mode" varchar(50),
	CONSTRAINT "products_to_options_groups_product_id_group_id_pk" PRIMARY KEY("product_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"full_name" varchar(255),
	"role" varchar(50),
	"avatar_url" text,
	"phone" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "restaurant_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"capacity" integer DEFAULT 4 NOT NULL,
	"section" varchar(100),
	"status" "restaurant_table_status" DEFAULT 'free' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"order" integer DEFAULT 0,
	"active" boolean DEFAULT true
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
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"global_role" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"customer_phone" varchar(30),
	"party_size" integer DEFAULT 1 NOT NULL,
	"special_requests" text,
	"status" "waitlist_status" DEFAULT 'waiting' NOT NULL,
	"assigned_table_id" uuid,
	"notified_at" timestamp,
	"seated_at" timestamp,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_certificates" ADD CONSTRAINT "fiscal_certificates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_configs" ADD CONSTRAINT "fiscal_configs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options_groups" ADD CONSTRAINT "product_options_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options_items" ADD CONSTRAINT "product_options_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options_items" ADD CONSTRAINT "product_options_items_group_id_product_options_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."product_options_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_to_options_groups" ADD CONSTRAINT "products_to_options_groups_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_to_options_groups" ADD CONSTRAINT "products_to_options_groups_group_id_product_options_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."product_options_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_events" ADD CONSTRAINT "table_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_assigned_table_id_restaurant_tables_id_fk" FOREIGN KEY ("assigned_table_id") REFERENCES "public"."restaurant_tables"("id") ON DELETE set null ON UPDATE no action;