import type {
	Mood,
	ProductCategory,
	StylePreset,
} from '@1dragon/shared'

export interface VisionAnalyzerInput {
	readonly imageUrl: string
	readonly categoryHint?: ProductCategory
	readonly resolution?: {
		readonly width: number
		readonly height: number
	}
}

export interface VisionAnalysisOutput {
	readonly category: ProductCategory
	readonly keywords: ReadonlyArray<string>
	readonly moods: ReadonlyArray<Mood>
	readonly colors: ReadonlyArray<string>
	readonly targetAudience: string
	readonly suggestedStyles: ReadonlyArray<StylePreset>
	readonly isProductImage: boolean
	readonly confidence: number
}

export interface RemoveBgInput {
	readonly imageUrl: string
	readonly hasTransparency?: boolean
}

export interface RemoveBgOutput {
	readonly imageUrl: string
	readonly transparentBackground: boolean
}

export interface ImageEnhancerInput {
	readonly imageUrl: string
	readonly targetResolution?: { width: number; height: number }
}

export interface ImageEnhancerOutput {
	readonly imageUrl: string
	readonly hasTransparency: boolean
}

export interface ImageGeneratorInput {
	readonly imageUrl: string
	readonly prompt: string
}

export interface ImageGeneratorOutput {
	readonly imageUrl: string
}

export interface VisionAnalyzerPort {
	analyze(input: VisionAnalyzerInput): Promise<VisionAnalysisOutput>
}

export interface RemoveBgPort {
	removeBackground(input: RemoveBgInput): Promise<RemoveBgOutput>
}

export interface ImageEnhancerPort {
	removeNoise(input: ImageEnhancerInput): Promise<ImageEnhancerOutput>
}

export interface ImageGeneratorPort {
	generate(input: ImageGeneratorInput): Promise<ImageGeneratorOutput>
}

export interface ProductAnalysisRecord {
	readonly id: string
	readonly userId: string
	readonly imageUrl: string
	readonly category: ProductCategory | null
	readonly keywords: ReadonlyArray<string>
	readonly mood: string | null
	readonly colors: ReadonlyArray<string>
	readonly targetAudience: string | null
	readonly suggestedStyles: ReadonlyArray<StylePreset>
	readonly confidenceScore: number | null
	readonly isProductImage: boolean | null
	readonly createdAt: Date
	readonly updatedAt: Date
	readonly resolution: { width: number; height: number } | null
	readonly hasTransparentBg: boolean | null
	readonly enhancedImageUrl: string | null
	readonly backgroundRemovedImageUrl: string | null
}

export interface ProductAnalysisCreateInput {
	readonly userId: string
	readonly imageUrl: string
	readonly category: ProductCategory | null
	readonly keywords: ReadonlyArray<string>
	readonly mood: Mood | null
	readonly colors: ReadonlyArray<string>
	readonly targetAudience: string | null
	readonly suggestedStyles: ReadonlyArray<StylePreset>
	readonly confidenceScore: number | null
	readonly isProductImage: boolean
	readonly resolution: { width: number; height: number }
	readonly hasTransparentBg: boolean
	readonly enhancedImageUrl: string | null
	readonly backgroundRemovedImageUrl: string | null
}

export interface ProductAnalysisListQuery {
	readonly limit: number
	readonly offset: number
}

export interface ProductAnalysisRepository {
	create(input: ProductAnalysisCreateInput): Promise<ProductAnalysisRecord>
	findById(id: string, userId: string): Promise<ProductAnalysisRecord | null>
	findByUserId(userId: string, query: ProductAnalysisListQuery): Promise<{
		items: ProductAnalysisRecord[]
		total: number
	}>
	deleteById(id: string, userId: string): Promise<boolean>
}
