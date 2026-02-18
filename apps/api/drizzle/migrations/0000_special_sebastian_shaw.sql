CREATE TYPE "public"."age_range" AS ENUM('YOUNG_ADULT', 'ADULT', 'MIDDLE_AGED', 'SENIOR');--> statement-breakpoint
CREATE TYPE "public"."billing_cycle" AS ENUM('MONTHLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE', 'NON_BINARY');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('QUEUED', 'ANALYZING', 'GENERATING', 'COMPOSING', 'RENDERING_VARIANTS', 'SUCCEEDED', 'FAILED', 'DEGRADED_FAILED');--> statement-breakpoint
CREATE TYPE "public"."mood" AS ENUM('ENERGETIC', 'CALM', 'LUXURY', 'PLAYFUL', 'PROFESSIONAL', 'WARM', 'MINIMALIST');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."plan_tier" AS ENUM('FREE', 'STARTER');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('TIKTOK', 'YOUTUBE_SHORTS', 'INSTAGRAM_REELS');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('FASHION', 'BEAUTY', 'FOOD', 'ELECTRONICS', 'HOME', 'ACCESSORIES', 'SPORTS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."style_preset" AS ENUM('SIMPLE', 'DYNAMIC', 'EMOTIONAL', 'TRENDY', 'PREMIUM');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED', 'TRIAL');--> statement-breakpoint
CREATE TYPE "public"."subtitle_style" AS ENUM('SIMPLE', 'BOLD', 'MOTION');--> statement-breakpoint
CREATE TABLE "job_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_persona_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"gender" "gender" NOT NULL,
	"age_range" "age_range" NOT NULL,
	"body_type" varchar(50),
	"style" varchar(100) NOT NULL,
	"imagen_prompt_template" text NOT NULL,
	"preview_image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_persona_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid,
	"preset_id" uuid NOT NULL,
	"generated_image_url" text,
	"quality_score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"payment_key" varchar(255) NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'KRW' NOT NULL,
	"method" varchar(100) DEFAULT 'CARD' NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_payment_key_unique" UNIQUE("payment_key")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"tier" "plan_tier" NOT NULL,
	"quota" integer NOT NULL,
	"limits" jsonb DEFAULT '{}' NOT NULL,
	"features" jsonb DEFAULT '[]' NOT NULL,
	"price_monthly" integer NOT NULL,
	"price_yearly" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_tier_unique" UNIQUE("tier")
);
--> statement-breakpoint
CREATE TABLE "platform_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "platform" NOT NULL,
	"resolution" varchar(50) NOT NULL,
	"safe_zone" jsonb DEFAULT '{}' NOT NULL,
	"optimal_length" integer NOT NULL,
	"max_file_size" integer,
	"aspect_ratio" varchar(20) NOT NULL,
	"recommended_formats" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_specs_platform_unique" UNIQUE("platform")
);
--> statement-breakpoint
CREATE TABLE "product_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"category" "product_category",
	"keywords" jsonb DEFAULT '[]' NOT NULL,
	"mood" "mood",
	"colors" jsonb DEFAULT '[]' NOT NULL,
	"target_audience" text,
	"suggested_styles" jsonb DEFAULT '[]' NOT NULL,
	"confidence_score" real,
	"is_product_image" boolean,
	"resolution" jsonb DEFAULT '{}',
	"has_transparent_bg" boolean DEFAULT false NOT NULL,
	"enhanced_image_url" text,
	"background_removed_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "style_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"style_parameters" jsonb DEFAULT '{}' NOT NULL,
	"preview_video_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "style_presets_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"billing_cycle" "billing_cycle" DEFAULT 'MONTHLY' NOT NULL,
	"status" "subscription_status" NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"base_quota" integer DEFAULT 3 NOT NULL,
	"remaining_credits" integer DEFAULT 3 NOT NULL,
	"watermark_bonus_credits" integer DEFAULT 0 NOT NULL,
	"offer_expires_at" timestamp with time zone,
	"payment_retry_count" integer DEFAULT 0 NOT NULL,
	"past_due_since" timestamp with time zone,
	"next_retry_at" timestamp with time zone,
	"last_paid_at" timestamp with time zone,
	"cost_budget_usd" real DEFAULT 20 NOT NULL,
	"cost_used_usd" real DEFAULT 0 NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"avatar_url" text,
	"onboarding_data" jsonb DEFAULT '{}',
	"is_onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "video_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'QUEUED' NOT NULL,
	"input_image_url" text NOT NULL,
	"product_analysis_id" uuid,
	"model_persona_selection_id" uuid,
	"progress" integer DEFAULT 0 NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"resolution" varchar(50) NOT NULL,
	"duration" integer NOT NULL,
	"file_url" text,
	"file_size" integer,
	"thumbnail_url" text,
	"has_watermark" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(100) NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"resource_id" varchar(255),
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"signature" text,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"occurred_at" timestamp with time zone,
	"version" varchar(50),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_job_id_video_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."video_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_persona_selections" ADD CONSTRAINT "model_persona_selections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_persona_selections" ADD CONSTRAINT "model_persona_selections_job_id_video_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."video_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_persona_selections" ADD CONSTRAINT "model_persona_selections_preset_id_model_persona_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."model_persona_presets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_analyses" ADD CONSTRAINT "product_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_variants" ADD CONSTRAINT "video_variants_job_id_video_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."video_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_events_job_id_idx" ON "job_events" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_events_processed_idx" ON "job_events" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "job_events_created_at_idx" ON "job_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "model_persona_presets_gender_age_idx" ON "model_persona_presets" USING btree ("gender","age_range");--> statement-breakpoint
CREATE UNIQUE INDEX "model_persona_presets_unique_idx" ON "model_persona_presets" USING btree ("gender","age_range","body_type","style");--> statement-breakpoint
CREATE INDEX "model_persona_presets_is_active_idx" ON "model_persona_presets" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "model_persona_selections_user_id_idx" ON "model_persona_selections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "model_persona_selections_job_id_idx" ON "model_persona_selections" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "model_persona_selections_preset_id_idx" ON "model_persona_selections" USING btree ("preset_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_user_id_idx" ON "payment_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_subscription_id_idx" ON "payment_transactions" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_transactions_paid_at_idx" ON "payment_transactions" USING btree ("paid_at");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_tier_idx" ON "plans" USING btree ("tier");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_specs_platform_idx" ON "platform_specs" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "product_analyses_user_id_idx" ON "product_analyses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "product_analyses_category_idx" ON "product_analyses" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "style_presets_name_idx" ON "style_presets" USING btree ("name");--> statement-breakpoint
CREATE INDEX "style_presets_is_active_idx" ON "style_presets" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_user_plan_idx" ON "subscriptions" USING btree ("user_id","plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "video_jobs_user_id_idx" ON "video_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_jobs_status_idx" ON "video_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_jobs_created_at_idx" ON "video_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "video_variants_job_id_idx" ON "video_variants" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "video_variants_platform_idx" ON "video_variants" USING btree ("platform");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_external_id_idx" ON "webhook_events" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "webhook_events_provider_idx" ON "webhook_events" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "webhook_events_resource_id_idx" ON "webhook_events" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "webhook_events_processed_idx" ON "webhook_events" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "webhook_events_created_at_idx" ON "webhook_events" USING btree ("created_at");