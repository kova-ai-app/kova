-- Migration: Schema restructure
-- 1. Create customers table
-- 2. Rename coaching_points to feedback
-- 3. Add customerId FK to calls/jobs, drop customerName
-- 4. Add sold tracking columns to opportunities

-- ---- Create customers table ----
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ---- Rename coaching_points to feedback ----
ALTER TABLE "coaching_points" RENAME TO "feedback";
--> statement-breakpoint

-- ---- Calls: add customer_id, drop customer_name ----
ALTER TABLE "calls" ADD COLUMN "customer_id" uuid;
--> statement-breakpoint
ALTER TABLE "calls" DROP COLUMN IF EXISTS "customer_name";
--> statement-breakpoint

-- ---- Jobs: add customer_id, drop customer_name ----
ALTER TABLE "jobs" ADD COLUMN "customer_id" uuid;
--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN IF EXISTS "customer_name";
--> statement-breakpoint

-- ---- Opportunities: add sold tracking columns ----
ALTER TABLE "opportunities" ADD COLUMN "sold_amount" real;
--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "sold_pricebook_item_id" uuid;
--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "sold_at" timestamp;
--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "sold_by_user_id" uuid;
--> statement-breakpoint

-- ---- Foreign keys ----
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_sold_pricebook_item_id_pricebook_items_id_fk" FOREIGN KEY ("sold_pricebook_item_id") REFERENCES "public"."pricebook_items"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_sold_by_user_id_users_id_fk" FOREIGN KEY ("sold_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- ---- Indexes ----
CREATE INDEX "customers_company" ON "customers" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX "customers_phone" ON "customers" USING btree ("phone");
