import type { Platform, ProductCategory } from '@snapvid/shared'
import type { HookFormula, Slide, Slideshow } from './entities.js'
import type { ContentToneVO, SlideSpecVO } from './value-objects.js'

export interface SlideGeneratorInput {
	readonly productImageUrl: string
	readonly productName: string
	readonly slideSpec: SlideSpecVO
	readonly tone: ContentToneVO
	readonly slidePrompts: ReadonlyArray<{
		readonly role: string
		readonly imagePrompt: string
		readonly overlayText: string | null
	}>
}

export interface SlideGeneratorOutput {
	readonly slides: ReadonlyArray<Slide>
	readonly costUsd: number
}

export interface CopyGeneratorInput {
	readonly hookFormula: HookFormula
	readonly productName: string
	readonly productCategory: ProductCategory
	readonly tone: ContentToneVO
	readonly platform: Platform
}

export interface CopyGeneratorOutput {
	readonly hookText: string
	readonly caption: string
	readonly hashtags: ReadonlyArray<string>
	readonly cta: string
}

export interface SlideshowRecord {
	readonly id: string
	readonly userId: string
	readonly productAnalysisId: string
	readonly hookFormulaId: string
	readonly platform: Platform
	readonly status: string
	readonly caption: string
	readonly hashtags: ReadonlyArray<string>
	readonly estimatedCostUsd: number
	readonly slideCount: number
	readonly createdAt: Date
	readonly updatedAt: Date
}

export interface SlideshowCreateInput {
	readonly id: string
	readonly userId: string
	readonly productAnalysisId: string
	readonly hookFormulaId: string
	readonly platform: Platform
	readonly caption: string
	readonly hashtags: ReadonlyArray<string>
	readonly estimatedCostUsd: number
	readonly slideCount: number
}

export interface HookFormulaRecord {
	readonly id: string
	readonly pattern: string
	readonly template: string
	readonly category: string
	readonly exampleHook: string | null
	readonly successCount: number
	readonly totalUses: number
	readonly createdAt: Date
	readonly updatedAt: Date
}

export interface SlideImageGeneratorPort {
	generateSlideImages(input: SlideGeneratorInput): Promise<SlideGeneratorOutput>
}

export interface CopyGeneratorPort {
	generateCopy(input: CopyGeneratorInput): Promise<CopyGeneratorOutput>
}

export interface SlideshowRepository {
	create(input: SlideshowCreateInput): Promise<SlideshowRecord>
	findById(id: string, userId: string): Promise<SlideshowRecord | null>
	updateStatus(id: string, status: string): Promise<SlideshowRecord | null>
	findByUserId(userId: string, query: {
		readonly limit: number
		readonly offset: number
	}): Promise<{
		readonly items: ReadonlyArray<SlideshowRecord>
		readonly total: number
	}>
}

export interface HookFormulaRepository {
	findByCategory(category: ProductCategory): Promise<ReadonlyArray<HookFormulaRecord>>
	findById(id: string): Promise<HookFormulaRecord | null>
	updateMetrics(id: string, successCount: number, totalUses: number): Promise<void>
	create(input: {
		readonly pattern: string
		readonly template: string
		readonly category: string
		readonly exampleHook?: string | null
	}): Promise<HookFormulaRecord>
}
