import {
	pgTable,
	uuid,
	text,
	timestamp,
	integer,
	boolean,
	jsonb,
	real,
	varchar,
	index,
	uniqueIndex,
	pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Enums ────────────────────────────────────────────────────────────────────

export const platformEnum = pgEnum('platform', ['TIKTOK', 'YOUTUBE_SHORTS', 'INSTAGRAM_REELS'])

export const stylePresetEnum = pgEnum('style_preset', [
	'SIMPLE',
	'DYNAMIC',
	'EMOTIONAL',
	'TRENDY',
	'PREMIUM',
])

export const productCategoryEnum = pgEnum('product_category', [
	'FASHION',
	'BEAUTY',
	'FOOD',
	'ELECTRONICS',
	'HOME',
	'ACCESSORIES',
	'SPORTS',
	'OTHER',
])

export const moodEnum = pgEnum('mood', [
	'ENERGETIC',
	'CALM',
	'LUXURY',
	'PLAYFUL',
	'PROFESSIONAL',
	'WARM',
	'MINIMALIST',
])

export const jobStatusEnum = pgEnum('job_status', [
	'QUEUED',
	'ANALYZING',
	'GENERATING',
	'COMPOSING',
	'RENDERING_VARIANTS',
	'SUCCEEDED',
	'FAILED',
	'DEGRADED_FAILED',
])

export const subscriptionStatusEnum = pgEnum('subscription_status', [
	'ACTIVE',
	'PAST_DUE',
	'EXPIRED',
	'CANCELLED',
	'TRIAL',
])

export const planTierEnum = pgEnum('plan_tier', ['FREE', 'STARTER'])
export const billingCycleEnum = pgEnum('billing_cycle', ['MONTHLY', 'YEARLY'])

export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE', 'NON_BINARY'])

export const ageRangeEnum = pgEnum('age_range', ['YOUNG_ADULT', 'ADULT', 'MIDDLE_AGED', 'SENIOR'])

export const subtitleStyleEnum = pgEnum('subtitle_style', ['SIMPLE', 'BOLD', 'MOTION'])

// ── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
	'users',
	{
		id: text('id').primaryKey(),
		email: varchar('email', { length: 255 }).notNull().unique(),
		name: varchar('name', { length: 255 }),
		avatarUrl: text('avatar_url'),
		onboardingData: jsonb('onboarding_data').default('{}'),
		isOnboardingCompleted: boolean('is_onboarding_completed').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
	},
	(table) => ({
		emailIdx: uniqueIndex('users_email_idx').on(table.email),
		deletedAtIdx: index('users_deleted_at_idx').on(table.deletedAt),
	}),
)

// ── Plans ────────────────────────────────────────────────────────────────────

export const plans = pgTable(
	'plans',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: varchar('name', { length: 255 }).notNull(),
		tier: planTierEnum('tier').notNull().unique(),
		quota: integer('quota').notNull(),
		limits: jsonb('limits').notNull().default('{}'),
		features: jsonb('features').notNull().default('[]'),
		priceMonthly: integer('price_monthly').notNull(),
		priceYearly: integer('price_yearly').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		tierIdx: uniqueIndex('plans_tier_idx').on(table.tier),
	}),
)

// ── Subscriptions ────────────────────────────────────────────────────────────

export const subscriptions = pgTable(
	'subscriptions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		planId: uuid('plan_id')
			.notNull()
			.references(() => plans.id, { onDelete: 'restrict' }),
		billingCycle: billingCycleEnum('billing_cycle').notNull().default('MONTHLY'),
		status: subscriptionStatusEnum('status').notNull(),
		currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
		currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
		baseQuota: integer('base_quota').notNull().default(3),
		remainingCredits: integer('remaining_credits').notNull().default(3),
		watermarkBonusCredits: integer('watermark_bonus_credits').notNull().default(0),
		offerExpiresAt: timestamp('offer_expires_at', { withTimezone: true }),
		paymentRetryCount: integer('payment_retry_count').notNull().default(0),
		pastDueSince: timestamp('past_due_since', { withTimezone: true }),
		nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
		lastPaidAt: timestamp('last_paid_at', { withTimezone: true }),
		costBudgetUsd: real('cost_budget_usd').notNull().default(20),
		costUsedUsd: real('cost_used_usd').notNull().default(0),
		cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
		planIdIdx: index('subscriptions_plan_id_idx').on(table.planId),
		statusIdx: index('subscriptions_status_idx').on(table.status),
		userPlanIdx: uniqueIndex('subscriptions_user_plan_idx').on(table.userId, table.planId),
	}),
)

// ── Payment Transactions ─────────────────────────────────────────────────────

export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'])

export const paymentTransactions = pgTable(
	'payment_transactions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		subscriptionId: uuid('subscription_id')
			.notNull()
			.references(() => subscriptions.id, { onDelete: 'cascade' }),
		paymentKey: varchar('payment_key', { length: 255 }).notNull().unique(),
		orderId: varchar('order_id', { length: 255 }).notNull(),
		amount: integer('amount').notNull(),
		currency: varchar('currency', { length: 10 }).notNull().default('KRW'),
		method: varchar('method', { length: 100 }).notNull().default('CARD'),
		status: paymentStatusEnum('status').notNull().default('PENDING'),
		paidAt: timestamp('paid_at', { withTimezone: true }),
		refundedAt: timestamp('refunded_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		userIdIdx: index('payment_transactions_user_id_idx').on(table.userId),
		subscriptionIdIdx: index('payment_transactions_subscription_id_idx').on(table.subscriptionId),
		statusIdx: index('payment_transactions_status_idx').on(table.status),
		paidAtIdx: index('payment_transactions_paid_at_idx').on(table.paidAt),
	}),
)

// ── Video Jobs ───────────────────────────────────────────────────────────────

export const videoJobs = pgTable(
	'video_jobs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		status: jobStatusEnum('status').notNull().default('QUEUED'),
		inputImageUrl: text('input_image_url').notNull(),
		productAnalysisId: uuid('product_analysis_id'),
		referenceIntake: jsonb('reference_intake'),
		modelPersonaSelectionId: uuid('model_persona_selection_id'),
		progress: integer('progress').notNull().default(0),
		retryCount: integer('retry_count').notNull().default(0),
		errorMessage: text('error_message'),
		startedAt: timestamp('started_at', { withTimezone: true }),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		userIdIdx: index('video_jobs_user_id_idx').on(table.userId),
		statusIdx: index('video_jobs_status_idx').on(table.status),
		createdAtIdx: index('video_jobs_created_at_idx').on(table.createdAt),
	}),
)

// ── Video Variants ───────────────────────────────────────────────────────────

export const videoVariants = pgTable(
	'video_variants',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		jobId: uuid('job_id')
			.notNull()
			.references(() => videoJobs.id, { onDelete: 'cascade' }),
		platform: platformEnum('platform').notNull(),
		resolution: varchar('resolution', { length: 50 }).notNull(),
		duration: integer('duration').notNull(),
		fileUrl: text('file_url'),
		fileSize: integer('file_size'),
		thumbnailUrl: text('thumbnail_url'),
		hasWatermark: boolean('has_watermark').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		jobIdIdx: index('video_variants_job_id_idx').on(table.jobId),
		platformIdx: index('video_variants_platform_idx').on(table.platform),
	}),
)

// ── Job Events (Outbox Pattern) ──────────────────────────────────────────────

export const jobEvents = pgTable(
	'job_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		jobId: uuid('job_id')
			.notNull()
			.references(() => videoJobs.id, { onDelete: 'cascade' }),
		eventType: varchar('event_type', { length: 100 }).notNull(),
		payload: jsonb('payload').notNull().default('{}'),
		processed: boolean('processed').notNull().default(false),
		processedAt: timestamp('processed_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		jobIdIdx: index('job_events_job_id_idx').on(table.jobId),
		processedIdx: index('job_events_processed_idx').on(table.processed),
		createdAtIdx: index('job_events_created_at_idx').on(table.createdAt),
	}),
)

// ── Product Analyses ─────────────────────────────────────────────────────────

export const productAnalyses = pgTable(
	'product_analyses',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		imageUrl: text('image_url').notNull(),
		category: productCategoryEnum('category'),
		keywords: jsonb('keywords').notNull().default('[]'),
		mood: moodEnum('mood'),
		colors: jsonb('colors').notNull().default('[]'),
		targetAudience: text('target_audience'),
		suggestedStyles: jsonb('suggested_styles').notNull().default('[]'),
		confidenceScore: real('confidence_score'),
		isProductImage: boolean('is_product_image'),
		resolution: jsonb('resolution').default('{}'),
		hasTransparentBg: boolean('has_transparent_bg').notNull().default(false),
		enhancedImageUrl: text('enhanced_image_url'),
		backgroundRemovedImageUrl: text('background_removed_image_url'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		userIdIdx: index('product_analyses_user_id_idx').on(table.userId),
		categoryIdx: index('product_analyses_category_idx').on(table.category),
	}),
)

// ── Model Persona Presets ────────────────────────────────────────────────────

export const modelPersonaPresets = pgTable(
	'model_persona_presets',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: varchar('name', { length: 120 }).notNull(),
		gender: genderEnum('gender').notNull(),
		ageRange: ageRangeEnum('age_range').notNull(),
		bodyType: varchar('body_type', { length: 50 }),
		style: varchar('style', { length: 100 }).notNull(),
		imagenPromptTemplate: text('imagen_prompt_template').notNull(),
		previewImageUrl: text('preview_image_url'),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		genderAgeIdx: index('model_persona_presets_gender_age_idx').on(table.gender, table.ageRange),
		personaUniqueIdx: uniqueIndex('model_persona_presets_unique_idx').on(
			table.gender,
			table.ageRange,
			table.bodyType,
			table.style,
		),
		isActiveIdx: index('model_persona_presets_is_active_idx').on(table.isActive),
	}),
)

// ── Model Persona Selections ─────────────────────────────────────────────────

export const modelPersonaSelections = pgTable(
	'model_persona_selections',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		jobId: uuid('job_id').references(() => videoJobs.id, { onDelete: 'set null' }),
		presetId: uuid('preset_id')
			.notNull()
			.references(() => modelPersonaPresets.id, { onDelete: 'restrict' }),
		generatedImageUrl: text('generated_image_url'),
		qualityScore: real('quality_score'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		userIdIdx: index('model_persona_selections_user_id_idx').on(table.userId),
		jobIdIdx: index('model_persona_selections_job_id_idx').on(table.jobId),
		presetIdIdx: index('model_persona_selections_preset_id_idx').on(table.presetId),
	}),
)

// ── Platform Specs ───────────────────────────────────────────────────────────

export const platformSpecs = pgTable(
	'platform_specs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		platform: platformEnum('platform').notNull().unique(),
		resolution: varchar('resolution', { length: 50 }).notNull(),
		safeZone: jsonb('safe_zone').notNull().default('{}'),
		optimalLength: integer('optimal_length').notNull(),
		maxFileSize: integer('max_file_size'),
		aspectRatio: varchar('aspect_ratio', { length: 20 }).notNull(),
		recommendedFormats: jsonb('recommended_formats').notNull().default('[]'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		platformIdx: uniqueIndex('platform_specs_platform_idx').on(table.platform),
	}),
)

// ── Style Presets ────────────────────────────────────────────────────────────

export const stylePresets = pgTable(
	'style_presets',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: varchar('name', { length: 100 }).notNull().unique(),
		description: text('description'),
		styleParameters: jsonb('style_parameters').notNull().default('{}'),
		previewVideoUrl: text('preview_video_url'),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		nameIdx: uniqueIndex('style_presets_name_idx').on(table.name),
		isActiveIdx: index('style_presets_is_active_idx').on(table.isActive),
	}),
)

// ── Webhook Events ───────────────────────────────────────────────────────────

export const webhookEvents = pgTable(
	'webhook_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		provider: varchar('provider', { length: 100 }).notNull(),
		externalId: varchar('external_id', { length: 255 }).notNull(),
		resourceId: varchar('resource_id', { length: 255 }),
		eventType: varchar('event_type', { length: 100 }).notNull(),
		payload: jsonb('payload').notNull().default('{}'),
		signature: text('signature'),
		processed: boolean('processed').notNull().default(false),
		processedAt: timestamp('processed_at', { withTimezone: true }),
		occurredAt: timestamp('occurred_at', { withTimezone: true }),
		version: varchar('version', { length: 50 }),
		errorMessage: text('error_message'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		externalIdIdx: uniqueIndex('webhook_events_external_id_idx').on(table.externalId),
		providerIdx: index('webhook_events_provider_idx').on(table.provider),
		resourceIdIdx: index('webhook_events_resource_id_idx').on(table.resourceId),
		eventTypeIdx: index('webhook_events_event_type_idx').on(table.eventType),
		processedIdx: index('webhook_events_processed_idx').on(table.processed),
		createdAtIdx: index('webhook_events_created_at_idx').on(table.createdAt),
	}),
)

// ── Relations ─────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
	subscriptions: many(subscriptions),
	videoJobs: many(videoJobs),
	productAnalyses: many(productAnalyses),
	modelPersonaSelections: many(modelPersonaSelections),
	paymentTransactions: many(paymentTransactions),
}))

export const plansRelations = relations(plans, ({ many }) => ({
	subscriptions: many(subscriptions),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
	user: one(users, {
		fields: [subscriptions.userId],
		references: [users.id],
	}),
	plan: one(plans, {
		fields: [subscriptions.planId],
		references: [plans.id],
	}),
}))

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
	user: one(users, {
		fields: [paymentTransactions.userId],
		references: [users.id],
	}),
	subscription: one(subscriptions, {
		fields: [paymentTransactions.subscriptionId],
		references: [subscriptions.id],
	}),
}))

export const videoJobsRelations = relations(videoJobs, ({ one, many }) => ({
	user: one(users, {
		fields: [videoJobs.userId],
		references: [users.id],
	}),
	productAnalysis: one(productAnalyses, {
		fields: [videoJobs.productAnalysisId],
		references: [productAnalyses.id],
	}),
	modelPersonaSelection: one(modelPersonaSelections, {
		fields: [videoJobs.modelPersonaSelectionId],
		references: [modelPersonaSelections.id],
	}),
	variants: many(videoVariants),
	events: many(jobEvents),
}))

export const videoVariantsRelations = relations(videoVariants, ({ one }) => ({
	job: one(videoJobs, {
		fields: [videoVariants.jobId],
		references: [videoJobs.id],
	}),
}))

export const jobEventsRelations = relations(jobEvents, ({ one }) => ({
	job: one(videoJobs, {
		fields: [jobEvents.jobId],
		references: [videoJobs.id],
	}),
}))

export const productAnalysesRelations = relations(productAnalyses, ({ one, many }) => ({
	user: one(users, {
		fields: [productAnalyses.userId],
		references: [users.id],
	}),
	videoJobs: many(videoJobs),
}))

export const modelPersonaPresetsRelations = relations(modelPersonaPresets, ({ many }) => ({
	selections: many(modelPersonaSelections),
}))

export const modelPersonaSelectionsRelations = relations(modelPersonaSelections, ({ one }) => ({
	user: one(users, {
		fields: [modelPersonaSelections.userId],
		references: [users.id],
	}),
	job: one(videoJobs, {
		fields: [modelPersonaSelections.jobId],
		references: [videoJobs.id],
	}),
	preset: one(modelPersonaPresets, {
		fields: [modelPersonaSelections.presetId],
		references: [modelPersonaPresets.id],
	}),
}))
