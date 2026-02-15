import { Mood, ProductCategory, StylePreset } from '@snapvid/shared'
import { ProductAnalysis, MoodVO, KeywordVO, StylePresetVO } from '@/domain/product/entities.js'
import { logger } from '../../infrastructure/logging/index.js'
import type {
	ImageEnhancerInput,
	ImageEnhancerOutput,
	ImageEnhancerPort,
	ImageGeneratorPort,
	RemoveBgInput,
	RemoveBgOutput,
	RemoveBgPort,
	VisionAnalysisOutput,
	VisionAnalyzerInput,
	VisionAnalyzerPort,
} from '@/domain/product/ports.js'

type AnalyzeImageInput = {
	readonly userId: string
	readonly imageUrl: string
	readonly resolution: {
		readonly width: number
		readonly height: number
	}
	readonly categoryHint?: ProductCategory
	readonly productName?: string
}

type AnalyzeImageOutput = {
	readonly analysis: ProductAnalysis
	readonly enhancedImageUrl: string
	readonly backgroundRemovedImageUrl: string | null
	readonly hasTransparentBg: boolean
	readonly queueMessage: string
	readonly isProductImage: boolean
}

export type { AnalyzeImageInput, AnalyzeImageOutput }

const VISION_TIMEOUT_MS = 5_000
function normalizeResolution(resolution: { width: number; height: number }) {
	return {
		width: Math.max(1, Math.round(resolution.width)),
		height: Math.max(1, Math.round(resolution.height)),
	}
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	const timeout = new Promise<never>((_, reject) => {
		setTimeout(() => {
			reject(new Error(`Operation timed out after ${timeoutMs}ms`))
		}, timeoutMs)
	})

	return Promise.race([promise, timeout])
}

function clampConfidence(value: number): number {
	if (!Number.isFinite(value)) {
		return 0
	}

	return Math.min(1, Math.max(0, value))
}

function normalizeStyles(styles: ReadonlyArray<string>): string[] {
	if (!styles.length) {
		return ['SIMPLE']
	}

	return styles
		.slice(0, 3)
		.map((style) => style.trim())
		.filter(Boolean)
}

const VALID_MOODS = new Set<string>(Object.values(Mood))

function mapMoodValue(value: string): Mood {
	const normalized = value.trim().toUpperCase()
	return VALID_MOODS.has(normalized) ? (normalized as Mood) : Mood.PROFESSIONAL
}

function normalizeKeywords(keywords: ReadonlyArray<string>): string[] {
	return keywords
		.map((keyword) => keyword.trim())
		.filter((keyword) => keyword.length > 0)
		.slice(0, 5)
}

function toEnumValue<T extends string>(value: string, allowed: readonly T[]): T {
	const normalized = value.trim().toUpperCase()
	if (allowed.includes(normalized as T)) {
		return normalized as T
	}

	const fallback = allowed[0]
	if (!fallback) {
		throw new Error('Expected enum values, but received empty allowed list')
	}

	return fallback
}

function normalizeVisionRequest(input: AnalyzeImageInput, normalizedResolution: { width: number; height: number }): VisionAnalyzerInput {
	const baseRequest: VisionAnalyzerInput = {
		imageUrl: input.imageUrl,
		resolution: normalizedResolution,
	}

	return input.categoryHint === undefined ? baseRequest : { ...baseRequest, categoryHint: input.categoryHint }
}

export class AnalyzeImageUseCase {
	public constructor(
		private readonly primaryVisionAnalyzer: VisionAnalyzerPort,
		private readonly fallbackVisionAnalyzer: VisionAnalyzerPort,
		private readonly removeBgPort: RemoveBgPort,
		private readonly imageEnhancer: ImageEnhancerPort,
		private readonly imageGenerator: ImageGeneratorPort,
	) {}

	public async execute(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
		const normalizedResolution = normalizeResolution(input.resolution)
		const visionResult = await this.analyzeWithFallback(input, normalizedResolution)

		const queueMessage = this.getQueueMessage(visionResult.isProductImage)
		if (!visionResult.isProductImage) {
			return {
				analysis: new ProductAnalysis({
					userId: input.userId,
					imageUrl: input.imageUrl,
					category: toEnumValue(visionResult.category, Object.values(ProductCategory)),
					keywords: normalizeKeywords(visionResult.keywords).map((keyword) => new KeywordVO(keyword)),
					moods: [new MoodVO(mapMoodValue(visionResult.moods[0] ?? Mood.PROFESSIONAL))],
					colors: visionResult.colors,
					targetAudience: visionResult.targetAudience,
					suggestedStyles: normalizeStyles(visionResult.suggestedStyles).map(
						(style) => new StylePresetVO(toEnumValue(style, Object.values(StylePreset))),
					),
					confidenceScore: clampConfidence(visionResult.confidence),
					isProductImage: false,
				}),
				enhancedImageUrl: input.imageUrl,
				backgroundRemovedImageUrl: null,
				hasTransparentBg: false,
				queueMessage,
				isProductImage: false,
			}
		}

		const targetResolution = this.getTargetResolution(normalizedResolution)
		const enhancedRequest: ImageEnhancerInput = {
			imageUrl: input.imageUrl,
			...(targetResolution ? { targetResolution } : {}),
		}
		const enhanced = await this.imageEnhancer.removeNoise(enhancedRequest)

		const backgroundResult = await this.removeBackground(enhanced)
		const generated = await this.imageGenerator.generate({
			imageUrl: backgroundResult.imageUrl,
			prompt: this.makePrompt({
				productName: input.productName,
				styles: visionResult.suggestedStyles,
				category: visionResult.category,
			}),
		})

		const normalizedCategory = toEnumValue(visionResult.category, Object.values(ProductCategory))
		const normalizedStyles = normalizeStyles(visionResult.suggestedStyles)

		return {
			analysis: new ProductAnalysis({
				userId: input.userId,
				imageUrl: generated.imageUrl,
				category: normalizedCategory,
				keywords: normalizeKeywords(visionResult.keywords).map((keyword) => new KeywordVO(keyword)),
				moods: [new MoodVO(mapMoodValue(visionResult.moods[0] ?? Mood.PROFESSIONAL))],
				colors: visionResult.colors,
				targetAudience: visionResult.targetAudience,
				suggestedStyles: normalizedStyles.map((style) => new StylePresetVO(toEnumValue(style, Object.values(StylePreset))),
				),
				confidenceScore: clampConfidence(visionResult.confidence),
				isProductImage: true,
			}),
			enhancedImageUrl: enhanced.imageUrl,
			backgroundRemovedImageUrl: backgroundResult.imageUrl,
			hasTransparentBg: backgroundResult.transparentBackground,
			queueMessage,
			isProductImage: true,
		}
	}

	private async analyzeWithFallback(
		input: AnalyzeImageInput,
		normalizedResolution: { width: number; height: number },
	): Promise<VisionAnalysisOutput> {
		const request = normalizeVisionRequest(input, normalizedResolution)

		try {
			return await withTimeout(this.primaryVisionAnalyzer.analyze(request), VISION_TIMEOUT_MS)
		} catch {
			return this.fallbackVisionAnalyzer.analyze(request)
		}
	}

	private getTargetResolution(resolution: { width: number; height: number }): ImageEnhancerInput['targetResolution'] {
		if (resolution.width >= 720 && resolution.height >= 720) {
			return undefined
		}

		const shortSide = Math.min(resolution.width, resolution.height)
		const scale = 720 / shortSide
		return {
			width: Math.max(720, Math.round(resolution.width * scale)),
			height: Math.max(720, Math.round(resolution.height * scale)),
		}
	}

	private async removeBackground(input: ImageEnhancerOutput): Promise<RemoveBgOutput> {
		const request: RemoveBgInput = {
			imageUrl: input.imageUrl,
			hasTransparency: input.hasTransparency,
		}

		try {
			return await this.removeBgPort.removeBackground(request)
		} catch {
			logger.warn(
				{
					imageUrl: input.imageUrl,
				},
				'remove-bg failed, using input image as fallback',
			)

			return {
				imageUrl: input.imageUrl,
				transparentBackground: Boolean(input.hasTransparency),
			}
		}
	}

	private makePrompt(input: VisionStyleInput): string {
		const style = normalizeStyles(input.styles)
		const name = input.productName

		return `${name ? `${name} ` : ''}${input.category} ${style.join(', ')}`.trim()
	}

	private getQueueMessage(isProductImage: boolean): string {
		if (!isProductImage) {
			return '상품 사진을 올려주세요'
		}

		return 'Image uploaded successfully and waiting for analysis'
	}
}

type VisionStyleInput = {
	readonly productName: string | undefined
	readonly styles: ReadonlyArray<string>
	readonly category: string
}
