/**
 * Media Domain Schemas
 * Video generation job 요청/응답 스키마
 */

import { z } from 'zod'
import {
	jobStatusSchema,
	platformSchema,
	storyConceptFamilySchema,
	stylePresetSchema,
	subtitleStyleSchema,
} from '../enums'
import { agenticExecutionPlanSchema, agenticModeSchema } from '../agentic'

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
	missingSignals: z.array(z.string().trim().min(1).max(80)).default([]),
	completenessScore: z.number().min(0).max(100),
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
})

// ── Type Exports ─────────────────────────────────────────────────────────────

export type CreateVideoJobRequest = z.infer<typeof createVideoJobRequestSchema>
export type CreateVideoJobResponse = z.infer<typeof createVideoJobResponseSchema>
export type RetryVideoJobRequest = z.infer<typeof retryVideoJobRequestSchema>
export type StoryConceptFamily = z.infer<typeof storyConceptFamilySchema>
export type ReferenceBrief = z.infer<typeof referenceBriefSchema>
export type NormalizedReferenceBrief = z.infer<typeof normalizedReferenceBriefSchema>
export type VideoJobResponse = z.infer<typeof videoJobResponseSchema>
export type VideoVariantResponse = z.infer<typeof videoVariantResponseSchema>
export type VideoJobDetailResponse = z.infer<typeof videoJobDetailResponseSchema>
export type MediaJobStatusResponse = z.infer<typeof mediaJobStatusResponseSchema>
