import type { ProductCategory } from '@snapvid/shared'
import type {
	ModelImageGeneratorPort,
	ModelPersonaSelectionRepository,
	PersonaPresetRecord,
} from '@/domain/model-persona/ports.js'
import { CompositeQualityValidator, type CompositeQualityEvaluation } from './composite-quality-validator.js'

const DEFAULT_MAX_RETRIES = 2
const FALLBACK_MESSAGE = '모델 합성에 실패했습니다. 상품 중심 영상으로 진행합니다'

export type GenerateModelImageInput = {
	readonly userId: string
	readonly jobId?: string
	readonly productImageUrl: string
	readonly productName?: string
	readonly productCategory: ProductCategory
	readonly productKeywords: ReadonlyArray<string>
	readonly preset: PersonaPresetRecord
	readonly maxRetries?: number
}

export type GenerateModelImageOutput = {
	readonly accepted: boolean
	readonly fallbackToProductOnly: boolean
	readonly generatedImageUrl: string | null
	readonly qualityScore: number | null
	readonly attempts: number
	readonly message: string
	readonly provider: 'GEMINI_IMAGEN' | null
	readonly prompt: string | null
}

export class GenerateModelImageUseCase {
	public constructor(
		private readonly modelImageGenerator: ModelImageGeneratorPort,
		private readonly selectionRepository: ModelPersonaSelectionRepository,
		private readonly qualityValidator = new CompositeQualityValidator(),
	) {}

	public async execute(input: GenerateModelImageInput): Promise<GenerateModelImageOutput> {
		const maxRetries = Math.max(0, input.maxRetries ?? DEFAULT_MAX_RETRIES)
		let attempts = 0
		let latestEvaluation: CompositeQualityEvaluation | null = null
		let latestImageUrl: string | null = null
		let latestPrompt: string | null = null
		let latestProvider: 'GEMINI_IMAGEN' | null = null
		let qualityHint = ''

		while (attempts <= maxRetries) {
			const generationInput = {
				productImageUrl: input.productImageUrl,
				productCategory: input.productCategory,
				productKeywords: input.productKeywords,
				preset: {
					id: input.preset.id,
					gender: input.preset.gender,
					ageRange: input.preset.ageRange,
					bodyType: input.preset.bodyType,
					style: input.preset.style,
					imagenPromptTemplate: input.preset.imagenPromptTemplate,
				},
				retryAttempt: attempts,
				qualityHint,
				...(input.productName ? { productName: input.productName } : {}),
			}
			const generation = await this.modelImageGenerator.generateComposite(generationInput)

			latestImageUrl = generation.imageUrl
			latestPrompt = generation.prompt
			latestProvider = generation.provider
			latestEvaluation = this.qualityValidator.evaluate(generation.qualitySignals)

			if (latestEvaluation.passed) {
				const qualityScore = Number(latestEvaluation.score.toFixed(4))
				await this.selectionRepository.create({
					userId: input.userId,
					presetId: input.preset.id,
					generatedImageUrl: generation.imageUrl,
					qualityScore,
					...(input.jobId ? { jobId: input.jobId } : {}),
				})

				return {
					accepted: true,
					fallbackToProductOnly: false,
					generatedImageUrl: generation.imageUrl,
					qualityScore,
					attempts: attempts + 1,
					message: '모델 합성 이미지 생성이 완료되었습니다',
					provider: generation.provider,
					prompt: generation.prompt,
				}
			}

			qualityHint = this.qualityValidator.buildAdjustmentHint(generation.qualitySignals)
			attempts += 1
		}

		await this.selectionRepository.create({
			userId: input.userId,
			presetId: input.preset.id,
			generatedImageUrl: latestImageUrl,
			qualityScore: latestEvaluation ? Number(latestEvaluation.score.toFixed(4)) : null,
			...(input.jobId ? { jobId: input.jobId } : {}),
		})

		return {
			accepted: false,
			fallbackToProductOnly: true,
			generatedImageUrl: latestImageUrl,
			qualityScore: latestEvaluation ? Number(latestEvaluation.score.toFixed(4)) : null,
			attempts: maxRetries + 1,
			message: FALLBACK_MESSAGE,
			provider: latestProvider,
			prompt: latestPrompt,
		}
	}
}
