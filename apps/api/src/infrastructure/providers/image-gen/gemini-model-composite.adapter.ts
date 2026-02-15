import { createHash } from 'node:crypto'
import type {
	ModelImageGenerationInput,
	ModelImageGenerationOutput,
	ModelImageGeneratorPort,
} from '@/domain/model-persona/ports.js'

function clampScore(score: number): number {
	if (!Number.isFinite(score)) {
		return 0
	}

	return Math.max(0, Math.min(1, score))
}

function interpolatePrompt(input: ModelImageGenerationInput): string {
	const keywords = input.productKeywords.join(', ') || 'product'
	const productName = input.productName?.trim() || 'product'
	const qualityHint = input.qualityHint?.trim() ? ` ${input.qualityHint.trim()}` : ''

	return input.preset.imagenPromptTemplate
		.replaceAll('{{product_name}}', productName)
		.replaceAll('{{product_category}}', input.productCategory)
		.replaceAll('{{product_keywords}}', keywords)
		.replaceAll('{{gender}}', input.preset.gender)
		.replaceAll('{{age_range}}', input.preset.ageRange)
		.replaceAll('{{body_type}}', input.preset.bodyType)
		.replaceAll('{{style}}', input.preset.style)
		.concat(qualityHint)
}

function buildDeterministicImageUrl(input: {
	readonly sourceImageUrl: string
	readonly presetId: string
	readonly prompt: string
	readonly retryAttempt: number
}): string {
	const digest = createHash('sha256')
		.update(`${input.sourceImageUrl}|${input.presetId}|${input.prompt}|${input.retryAttempt}`)
		.digest('hex')
		.slice(0, 16)
	const separator = input.sourceImageUrl.includes('?') ? '&' : '?'

	return `${input.sourceImageUrl}${separator}persona=${input.presetId}&v=${digest}`
}

function estimateQuality(input: {
	readonly retryAttempt: number
	readonly prompt: string
	readonly productKeywords: ReadonlyArray<string>
}): {
	visibilityScore: number
	naturalnessScore: number
	artifactScore: number
} {
	const normalizedRetry = Math.max(0, input.retryAttempt)
	const keywordBonus = Math.min(0.15, input.productKeywords.length * 0.03)
	const promptLengthBonus = Math.min(0.1, input.prompt.length / 400)
	const retryBonus = Math.min(0.12, normalizedRetry * 0.06)

	const visibilityScore = clampScore(0.62 + keywordBonus + retryBonus)
	const naturalnessScore = clampScore(0.58 + promptLengthBonus + retryBonus)
	const artifactScore = clampScore(0.55 + promptLengthBonus + retryBonus)

	return {
		visibilityScore,
		naturalnessScore,
		artifactScore,
	}
}

export class GeminiModelCompositeAdapter implements ModelImageGeneratorPort {
	public async generateComposite(input: ModelImageGenerationInput): Promise<ModelImageGenerationOutput> {
		const retryAttempt = Math.max(0, input.retryAttempt ?? 0)
		const prompt = interpolatePrompt(input)
		const qualitySignals = estimateQuality({
			retryAttempt,
			prompt,
			productKeywords: input.productKeywords,
		})

		return {
			imageUrl: buildDeterministicImageUrl({
				sourceImageUrl: input.productImageUrl,
				presetId: input.preset.id,
				prompt,
				retryAttempt,
			}),
			prompt,
			provider: 'GEMINI_IMAGEN',
			qualitySignals,
		}
	}
}
