CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"tech_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"recorded_at" timestamp NOT NULL,
	"duration_sec" integer DEFAULT 0 NOT NULL,
	"s3_key" text,
	"transcript_id" uuid,
	"score_id" uuid,
	"language" text DEFAULT 'unknown' NOT NULL,
	"status" text DEFAULT 'uploading' NOT NULL,
	"consent_logged_at" timestamp,
	"decline_reason" text,
	"customer_name" text,
	"job_type" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "calls_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "coaching_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"tech_id" uuid NOT NULL,
	"text" text NOT NULL,
	"clip_start_sec" real,
	"clip_end_sec" real,
	"reviewed_at" timestamp,
	"manager_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"plan" text DEFAULT 'pilot' NOT NULL,
	"state" text DEFAULT 'CA' NOT NULL,
	"clerk_org_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_clerk_org_id_unique" UNIQUE("clerk_org_id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"tech_id" uuid NOT NULL,
	"customer_name" text,
	"job_type" text NOT NULL,
	"call_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sent_at" timestamp,
	"read_at" timestamp,
	"channel" text DEFAULT 'push' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"score_id" uuid NOT NULL,
	"type" text NOT NULL,
	"triggered" boolean DEFAULT false NOT NULL,
	"offered" boolean DEFAULT false NOT NULL,
	"pricebook_item_id" uuid,
	"value_low" real DEFAULT 0 NOT NULL,
	"value_high" real DEFAULT 0 NOT NULL,
	"ltv_value" real,
	"clip_start_sec" real,
	"clip_end_sec" real,
	"is_default_price" boolean DEFAULT true NOT NULL,
	"dispute_reason" text,
	"disputed_at" timestamp,
	"confidence" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricebook_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"trade" text NOT NULL,
	"opportunity_type" text NOT NULL,
	"pricing_model" text NOT NULL,
	"price_fixed" real,
	"price_low" real,
	"price_high" real,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"ltv_annual" real,
	"ltv_years" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processing_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"tokens_in" integer,
	"tokens_out" integer,
	"cost_usd" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"overall_score" integer DEFAULT 0 NOT NULL,
	"dimensions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"opportunity_total_low" real DEFAULT 0 NOT NULL,
	"opportunity_total_high" real DEFAULT 0 NOT NULL,
	"confidence_level" text DEFAULT 'medium' NOT NULL,
	"model_used" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"prompt_version" text DEFAULT 'v1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"segments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"language" text DEFAULT 'unknown' NOT NULL,
	"wer_confidence" real,
	"provider" text DEFAULT 'deepgram' NOT NULL,
	"model" text DEFAULT 'nova-3-multilingual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"role" text DEFAULT 'technician' NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"language_pref" text DEFAULT 'en' NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_tech_id_users_id_fk" FOREIGN KEY ("tech_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_points" ADD CONSTRAINT "coaching_points_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_points" ADD CONSTRAINT "coaching_points_tech_id_users_id_fk" FOREIGN KEY ("tech_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tech_id_users_id_fk" FOREIGN KEY ("tech_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_score_id_scores_id_fk" FOREIGN KEY ("score_id") REFERENCES "public"."scores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricebook_items" ADD CONSTRAINT "pricebook_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_costs" ADD CONSTRAINT "processing_costs_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calls_company_recorded" ON "calls" USING btree ("company_id","recorded_at");--> statement-breakpoint
CREATE INDEX "calls_tech" ON "calls" USING btree ("tech_id");--> statement-breakpoint
CREATE INDEX "calls_status" ON "calls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "opportunities_score" ON "opportunities" USING btree ("score_id");--> statement-breakpoint
CREATE INDEX "opportunities_disputed" ON "opportunities" USING btree ("disputed_at");