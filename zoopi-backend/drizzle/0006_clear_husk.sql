CREATE TYPE "public"."payment_method" AS ENUM('dinheiro', 'credito', 'debito', 'pix', 'maquininha');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('total', 'parcial', 'por_comanda', 'adiantamento');--> statement-breakpoint
CREATE TABLE "table_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"table_id" uuid NOT NULL,
	"command_id" uuid,
	"customer_id" uuid,
	"customer_name" varchar(255),
	"method" "payment_method" NOT NULL,
	"mode" "payment_mode" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "table_payments" ADD CONSTRAINT "table_payments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_payments" ADD CONSTRAINT "table_payments_table_id_restaurant_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."restaurant_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_payments" ADD CONSTRAINT "table_payments_command_id_commands_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."commands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_payments" ADD CONSTRAINT "table_payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;