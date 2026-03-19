/**
 * Media Domain Schemas
 * Video generation job 요청/응답 스키마
 */

import { z } from 'zod'
import { agenticExecutionPlanSchema, agenticModeSchema } from '../agentic'
import {
	jobStatusSchema,
	platformSchema,
	productCategorySchema,
	storyConceptFamilySchema,
	stylePresetSchema,
	subtitleStyleSchema,
} from '../enums'

export const referenceBriefTargetAudienceSchema = z.object({
	summary: z.string().trim().min(1).max(160),
	useCases: z.array(z.string().trim().min(1).max(120)).max(5).default([]),
	painPoints: z.array(z.string().trim().min(1).max(120)).max(5).default([]),
})

export const referenceBriefSuccessMetricSchema = z.object({
	name: z.string().trim().min(1).max(80),
	target: z.string().trim().min(1).max(120).optional(),
})

export const referenceBriefQueryHintsSchema = z.object({
	productFacts: z.array(z.string().trim().min(1).max(160)).default([]),
	marketLanguage: z.array(z.string().trim().min(1).max(160)).default([]),
	proofQueries: z.array(z.string().trim().min(1).max(160)).default([]),
	competitorQueries: z.array(z.string().trim().min(1).max(160)).default([]),
})

export const landingPageSourceSchema = z.enum(['provided_text', 'fetched_url', 'url_only'])
export const referenceTaxonomyUsageContextSchema = z.enum([
	'ON_BODY',
	'HANDS_ON_DEMO',
	'DETAIL_CLOSEUP',
	'COMMUTE',
	'ROOM_CONTEXT',
	'DESK_SETUP',
	'BEAUTY_ROUTINE',
	'WORKOUT',
	'MEALTIME',
	'BEFORE_AFTER',
])
export const referenceBriefTaxonomySourceSchema = z.enum(['brief', 'product_analysis', 'merged'])

export const referenceBriefTaxonomySchema = z.object({
	category: productCategorySchema,
	source: referenceBriefTaxonomySourceSchema,
	usageContexts: z.array(referenceTaxonomyUsageContextSchema).min(1).max(5),
})

export const referenceIntakeProductAnalysisSchema = z.object({
	id: z.string().uuid(),
	category: productCategorySchema.nullable().optional(),
	keywords: z.array(z.string().trim().min(1).max(120)).default([]),
	targetAudience: z.string().trim().min(1).max(160).optional(),
})

export const referenceBriefSchema = z
	.object({
		productName: z.string().trim().min(1).max(160),
		productCategoryHint: z.string().trim().min(1).max(120).optional(),
		priceBand: z.string().trim().min(1).max(80).optional(),
		coreBenefits: z.array(z.string().trim().min(1).max(160)).min(1).max(5),
		differentiators: z.array(z.string().trim().min(1).max(160)).max(5).default([]),
		proofPoints: z.array(z.string().trim().min(1).max(160)).max(5).default([]),
		targetAudience: referenceBriefTargetAudienceSchema,
		landingPageUrl: z.string().url().optional(),
		landingPageText: z.string().trim().min(20).max(8_000).optional(),
		competitorExamples: z.array(z.string().trim().min(1).max(120)).max(5).default([]),
		categoryExamples: z.array(z.string().trim().min(1).max(120)).max(5).default([]),
		successMetrics: z.array(referenceBriefSuccessMetricSchema).max(5).default([]),
		platformTargets: platformSchema.array().min(1).max(3).optional(),
	})
	.superRefine((value, ctx) => {
		if (!value.landingPageUrl && !value.landingPageText) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'landingPageUrl or landingPageText is required',
				path: ['landingPageUrl'],
			})
		}
	})

export const normalizedReferenceBriefSchema = z.object({
	productName: z.string().trim().min(1).max(160),
	productCategoryHint: z.string().trim().min(1).max(120).optional(),
	productAnalysisId: z.string().uuid().optional(),
	priceBand: z.string().trim().min(1).max(80).optional(),
	coreBenefits: z.array(z.string().trim().min(1).max(160)).default([]),
	differentiators: z.array(z.string().trim().min(1).max(160)).default([]),
	proofPoints: z.array(z.string().trim().min(1).max(160)).default([]),
	targetAudienceSummary: z.string().trim().min(1).max(160),
	useCases: z.array(z.string().trim().min(1).max(120)).default([]),
	painPoints: z.array(z.string().trim().min(1).max(120)).default([]),
	landingPageUrl: z.string().url().optional(),
	landingPageExcerpt: z.string().trim().min(1).max(240).optional(),
	landingPageTitle: z.string().trim().min(1).max(160).optional(),
	landingPageDescription: z.string().trim().min(1).max(240).optional(),
	landingPageSource: landingPageSourceSchema,
	competitorExamples: z.array(z.string().trim().min(1).max(120)).default([]),
	categoryExamples: z.array(z.string().trim().min(1).max(120)).default([]),
	successMetrics: z.array(referenceBriefSuccessMetricSchema).default([]),
	platformTargets: platformSchema.array().min(1).max(3),
	queryHints: referenceBriefQueryHintsSchema,
	taxonomy: referenceBriefTaxonomySchema,
	missingSignals: z.array(z.string().trim().min(1).max(80)).default([]),
	completenessScore: z.number().min(0).max(100),
})

export const referenceIntakeSchema = z.object({
	referenceBrief: referenceBriefSchema,
	normalizedReferenceBrief: normalizedReferenceBriefSchema,
	taxonomy: referenceBriefTaxonomySchema.optional(),
	productAnalysisId: z.string().uuid().optional(),
	productAnalysis: referenceIntakeProductAnalysisSchema.optional(),
})

export const officialReferenceLaneSchema = z.enum([
	'OFFICIAL_SNS_STRUCTURE',
	'OFFICIAL_PLATFORM_PROMPT',
	'SIGNAL_MINING',
])

export const officialReferenceSourceSchema = z.enum([
	'TIKTOK_CREATIVE_CENTER',
	'META_AD_LIBRARY',
	'YOUTUBE_SHORTS_GUIDANCE',
	'RUNWAY_PROMPT_GUIDE',
	'SORA_PROMPT_GUIDE',
	'VEO_PROMPT_GUIDE',
	'GOOGLE_TRENDS',
])

export const officialReferenceRightsSchema = z.enum([
	'STRUCTURE_ONLY',
	'DOC_LIBRARY_USAGE',
	'DERIVED_METADATA_ONLY',
])

export const officialReferenceQueryIntentSchema = z.enum([
	'category',
	'proof',
	'market_language',
	'prompt_recipe',
])

export const officialReferenceQueryPlanItemSchema = z.object({
	lane: officialReferenceLaneSchema,
	source: officialReferenceSourceSchema,
	intent: officialReferenceQueryIntentSchema,
	query: z.string().trim().min(1).max(200),
	platformTarget: platformSchema.optional(),
	rights: officialReferenceRightsSchema,
	freshness: z.enum(['weekly', 'monthly']).default('weekly'),
	rationale: z.string().trim().min(1).max(240),
})

export const officialReferenceQueryPlanSchema = z.object({
	jobId: z.string().uuid(),
	taxonomy: referenceBriefTaxonomySchema,
	items: z.array(officialReferenceQueryPlanItemSchema).min(1).max(12),
})

export const officialReferenceDiscoveryTargetSchema = officialReferenceQueryPlanItemSchema.extend({
	adapter: z.enum(['open_url', 'manual_search']),
	surfaceLabel: z.string().trim().min(1).max(120),
	entryUrl: z.string().url().optional(),
	captureMode: z.enum(['structure_only', 'doc_library', 'derived_metadata']),
})

export const officialReferenceDiscoveryBundleSchema = z.object({
	jobId: z.string().uuid(),
	taxonomy: referenceBriefTaxonomySchema,
	targets: z.array(officialReferenceDiscoveryTargetSchema).min(1).max(12),
})

export const officialReferenceProbeStatusSchema = z.enum([
	'reachable',
	'unreachable',
	'manual',
])

export const officialReferenceProbeResultSchema = officialReferenceDiscoveryTargetSchema.extend({
	status: officialReferenceProbeStatusSchema,
	httpStatus: z.number().int().min(100).max(599).optional(),
	contentType: z.string().trim().min(1).max(160).optional(),
	resolvedUrl: z.string().url().optional(),
	pageTitle: z.string().trim().min(1).max(160).optional(),
	errorMessage: z.string().trim().min(1).max(200).optional(),
})

export const officialReferenceProbeBundleSchema = z.object({
	jobId: z.string().uuid(),
	taxonomy: referenceBriefTaxonomySchema,
	results: z.array(officialReferenceProbeResultSchema).min(1).max(12),
})

// ── Request Schemas ──────────────────────────────────────────────────────────

export const createVideoJobRequestSchema = z.object({
	imageUrl: z.string().url(),
	stylePreset: stylePresetSchema,
	idempotencyKey: z.string().trim().min(4).max(128).optional(),
	stage: z.string().trim().optional(),
	token: z.string().trim().optional(),
	platforms: platformSchema.array().min(1).max(3),
	narration: z.boolean().optional(),
	subtitleStyle: subtitleStyleSchema.optional(),
	personaId: z.string().uuid().optional(),
	duration: z.number().int().min(5).max(30).optional(),
	productCategory: z.string().optional(),
	moods: z.array(z.string()).optional(),
	keywords: z.array(z.string()).optional(),
	agenticMode: agenticModeSchema.optional(),
	autoShortformWorkflow: z.boolean().optional(),
	skipWearableComposite: z.boolean().optional(),
	creativeContext: z
		.object({
			location: z.string().trim().min(1).max(120).optional(),
			profession: z.string().trim().min(1).max(120).optional(),
			identity: z.string().trim().min(1).max(120).optional(),
			traits: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
			visualStyle: z.string().trim().min(1).max(120).optional(),
		})
		.optional(),
	copy: z
		.object({
			hook: z.string(),
			description: z.string(),
			cta: z.string(),
		})
		.optional(),
	recentConceptFamilies: z.array(storyConceptFamilySchema).max(5).optional(),
	requestedConceptFamily: storyConceptFamilySchema.optional(),
	referenceBrief: referenceBriefSchema.optional(),
	productAnalysisId: z.string().uuid().optional(),
})

export const retryVideoJobRequestSchema = z.object({
	jobId: z.string().uuid(),
	stylePreset: stylePresetSchema.optional(),
})

// ── Response Schemas ─────────────────────────────────────────────────────────

export const videoJobResponseSchema = z.object({
	id: z.string().uuid(),
	status: jobStatusSchema,
	progress: z.number().int().min(0).max(100),
	platforms: platformSchema.array(),
	stylePreset: stylePresetSchema,
	createdAt: z.string().datetime(),
	completedAt: z.string().datetime().optional(),
	estimatedSeconds: z.number().optional(),
	retryCount: z.number().int().min(0),
	canRetry: z.boolean(),
	errorMessage: z.string().nullable().optional(),
	startedAt: z.string().datetime().nullable().optional(),
	updatedAt: z.string().datetime().optional(),
})

export const createVideoJobResponseSchema = z.object({
	jobId: z.string().uuid(),
	status: jobStatusSchema,
	progress: z.number().int().min(0).max(100),
	retryCount: z.number().int().min(0),
	canRetry: z.boolean(),
	createdAt: z.string().datetime(),
	agenticPlan: agenticExecutionPlanSchema.optional(),
})

export const videoVariantResponseSchema = z.object({
	id: z.string().uuid(),
	jobId: z.string().uuid(),
	platform: platformSchema,
	videoUrl: z.string().url(),
	thumbnailUrl: z.string().url(),
	duration: z.number(),
	resolution: z.object({
		width: z.number().int().positive(),
		height: z.number().int().positive(),
	}),
	fileSize: z.number().int().positive(),
	hasWatermark: z.boolean(),
})

export const videoJobDetailResponseSchema = videoJobResponseSchema.extend({
	referenceIntake: referenceIntakeSchema.optional(),
	variants: videoVariantResponseSchema.array(),
})

export const videoJobEventSchema = z.object({
	eventType: z.literal('JOB_STATUS_CHANGED'),
	jobId: z.string().uuid(),
	newStatus: jobStatusSchema,
	progress: z.number().int().min(0).max(100),
	metadata: z.record(z.unknown()).default({}),
	timestamp: z.string().datetime(),
})

export const mediaJobStatusResponseSchema = z.object({
	job: videoJobResponseSchema,
	events: videoJobEventSchema.array().default([]),
	variants: videoVariantResponseSchema.array().default([]),
	referenceIntake: referenceIntakeSchema.optional(),
})

// ── Type Exports ─────────────────────────────────────────────────────────────

export type CreateVideoJobRequest = z.infer<typeof createVideoJobRequestSchema>
export type CreateVideoJobResponse = z.infer<typeof createVideoJobResponseSchema>
export type RetryVideoJobRequest = z.infer<typeof retryVideoJobRequestSchema>
export type StoryConceptFamily = z.infer<typeof storyConceptFamilySchema>
export type ReferenceBrief = z.infer<typeof referenceBriefSchema>
export type NormalizedReferenceBrief = z.infer<typeof normalizedReferenceBriefSchema>
export type ReferenceBriefTaxonomy = z.infer<typeof referenceBriefTaxonomySchema>
export type ReferenceTaxonomyUsageContext = z.infer<typeof referenceTaxonomyUsageContextSchema>
export type ReferenceIntakeProductAnalysis = z.infer<typeof referenceIntakeProductAnalysisSchema>
export type ReferenceIntake = z.infer<typeof referenceIntakeSchema>
export type OfficialReferenceQueryPlan = z.infer<typeof officialReferenceQueryPlanSchema>
export type OfficialReferenceQueryPlanItem = z.infer<typeof officialReferenceQueryPlanItemSchema>
export type OfficialReferenceDiscoveryTarget = z.infer<typeof officialReferenceDiscoveryTargetSchema>
export type OfficialReferenceDiscoveryBundle = z.infer<typeof officialReferenceDiscoveryBundleSchema>
export type OfficialReferenceProbeResult = z.infer<typeof officialReferenceProbeResultSchema>
export type OfficialReferenceProbeBundle = z.infer<typeof officialReferenceProbeBundleSchema>
export type VideoJobResponse = z.infer<typeof videoJobResponseSchema>
export type VideoVariantResponse = z.infer<typeof videoVariantResponseSchema>
export type VideoJobDetailResponse = z.infer<typeof videoJobDetailResponseSchema>
export type MediaJobStatusResponse = z.infer<typeof mediaJobStatusResponseSchema>
