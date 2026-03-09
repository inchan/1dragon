/**
 * Media Domain Schemas
 * Video generation job 요청/응답 스키마
 */

import { z } from 'zod'
import {
	jobStatusSchema,
	platformSchema,
	stylePresetSchema,
	subtitleStyleSchema,
} from '../enums'
import { agenticExecutionPlanSchema, agenticModeSchema } from '../agentic'

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
export type VideoJobResponse = z.infer<typeof videoJobResponseSchema>
export type VideoVariantResponse = z.infer<typeof videoVariantResponseSchema>
export type VideoJobDetailResponse = z.infer<typeof videoJobDetailResponseSchema>
export type MediaJobStatusResponse = z.infer<typeof mediaJobStatusResponseSchema>
