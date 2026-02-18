-- 1. FK 제약조건 삭제 (user_id → users.id)
ALTER TABLE "model_persona_selections" DROP CONSTRAINT IF EXISTS "model_persona_selections_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "payment_transactions" DROP CONSTRAINT IF EXISTS "payment_transactions_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "product_analyses" DROP CONSTRAINT IF EXISTS "product_analyses_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "video_jobs" DROP CONSTRAINT IF EXISTS "video_jobs_user_id_users_id_fk";--> statement-breakpoint

-- 2. users.id를 먼저 text로 변경
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint

-- 3. FK 컬럼들을 text로 변경
ALTER TABLE "model_persona_selections" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payment_transactions" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "product_analyses" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "video_jobs" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint

-- 4. FK 제약조건 재추가
ALTER TABLE "model_persona_selections" ADD CONSTRAINT "model_persona_selections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_analyses" ADD CONSTRAINT "product_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
