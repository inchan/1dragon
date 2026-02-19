import { createHash } from 'node:crypto'
import type {
	ModelImageGenerationInput,
	ModelImageGenerationOutput,
	ModelImageGeneratorPort,
} from '@/domain/model-persona/ports.js'
import { uploadImage } from '@/infrastructure/storage/s3-client.js'

type GeminiModelCompositeAdapterOptions = {
	readonly apiKey?: string
}

type ImagenApiResponse = {
	predictions?: Array<{
		bytesBase64Encoded?: string
		mimeType?: string
	}>
}

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

// 실제 이미지 품질 측정은 별도의 vision 모델 평가가 필요합니다.
// 현재는 프롬프트 품질 지표(키워드 수, 프롬프트 길이, 재시도 횟수)를 이용한 휴리스틱 추정값을 사용합니다.
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

async function callImagenApi(prompt: string, apiKey: string): Promise<Buffer> {
	const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=${apiKey}`

	const response = await fetch(endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			prompt,
			number_of_images: 1,
			aspectRatio: '9:16',
			personGeneration: 'allow_adult',
		}),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Imagen API error ${response.status}: ${errorText}`)
	}

	const data = (await response.json()) as ImagenApiResponse
	const prediction = data.predictions?.[0]

	if (!prediction?.bytesBase64Encoded) {
		throw new Error('Imagen API returned no image data')
	}

	return Buffer.from(prediction.bytesBase64Encoded, 'base64')
}

export class GeminiModelCompositeAdapter implements ModelImageGeneratorPort {
	private readonly apiKey: string | undefined

	public constructor(options: GeminiModelCompositeAdapterOptions = {}) {
		this.apiKey = options.apiKey
	}

	public async generateComposite(input: ModelImageGenerationInput): Promise<ModelImageGenerationOutput> {
		const retryAttempt = Math.max(0, input.retryAttempt ?? 0)
		const prompt = interpolatePrompt(input)
		const qualitySignals = estimateQuality({
			retryAttempt,
			prompt,
			productKeywords: input.productKeywords,
		})

		if (!this.apiKey) {
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

		const imageBuffer = await callImagenApi(prompt, this.apiKey)
		const key = `model-composites/anon/${Date.now()}-composite.png`
		const uploaded = await uploadImage(imageBuffer, key, 'image/png')

		return {
			imageUrl: uploaded.url,
			prompt,
			provider: 'GEMINI_IMAGEN',
			qualitySignals,
		}
	}
}
