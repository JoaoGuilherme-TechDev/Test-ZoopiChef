ALTER TYPE "public"."product_type" ADD VALUE 'additional' BEFORE 'combo';--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_subcategory_id_subcategories_id_fk";
--> statement-breakpoint
ALTER TABLE "subcategories" DROP CONSTRAINT "subcategories_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "product_options_groups" ALTER COLUMN "min_qty" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product_options_groups" ALTER COLUMN "max_qty" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "subcategory_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product_options_groups" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_options_items" ADD COLUMN "company_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "display_name" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit" varchar(50);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand" varchar(100);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "weight" varchar(50);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "ean" varchar(20);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cost_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "profit_margin" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sale_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_on_sale" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "loyalty_points" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "enologist_notes" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "commission" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "production_location" varchar(100);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "aparece_delivery" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "aparece_garcom" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "aparece_totem" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "aparece_tablet" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "aparece_mesa" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "aparece_comanda" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "aparece_tv" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "aparece_self_service" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "composition" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "production_weight" varchar(50) DEFAULT '1.0';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_weighted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "tax_status" varchar(50) DEFAULT 'tributado';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "internal_code" varchar(100);--> statement-breakpoint
ALTER TABLE "products_to_options_groups" ADD COLUMN "min_select" integer;--> statement-breakpoint
ALTER TABLE "products_to_options_groups" ADD COLUMN "max_select" integer;--> statement-breakpoint
ALTER TABLE "products_to_options_groups" ADD COLUMN "calc_mode" varchar(50);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "product_options_items" ADD CONSTRAINT "product_options_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options_groups" DROP COLUMN "active";