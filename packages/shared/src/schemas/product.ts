/**
 * Product Domain Schemas
 * 제품 이미지 분석 요청/응답 스키마
 */

import { z } from 'zod'
import { moodSchema, productCategorySchema, stylePresetSchema } from '../enums'

// ── Request Schemas ──────────────────────────────────────────────────────────

export const analyzeProductRequestSchema = z.object({
	productName: z.string().optional(),
	category: productCategorySchema.optional(),
})

// ── Response Schemas ─────────────────────────────────────────────────────────

export const productAnalysisResponseSchema = z.object({
	id: z.string().uuid(),
	category: productCategorySchema,
	keywords: z.string().array(),
	moods: moodSchema.array(),
	colors: z.string().array(),
	targetAudience: z.string(),
	suggestedStyles: stylePresetSchema.array(),
	hasTransparentBg: z.boolean(),
	resolution: z.object({
		width: z.number().int().positive(),
		height: z.number().int().positive(),
	}),
	originalImageUrl: z.string().url(),
	processedImageUrl: z.string().url().optional(),
	isProductImage: z.boolean(),
	confidence: z.number().min(0).max(1),
})

// ── Type Exports ─────────────────────────────────────────────────────────────

export type AnalyzeProductRequest = z.infer<typeof analyzeProductRequestSchema>
export type ProductAnalysisResponse = z.infer<typeof productAnalysisResponseSchema>
