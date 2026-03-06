import { ProductCategory } from '@1dragon/shared'
import { describe, expect, it } from 'vitest'
import type {
	ModelImageGenerationInput,
	ModelImageGenerationOutput,
	ModelImageGeneratorPort,
	ModelPersonaSelectionRepository,
	PersonaPresetRecord,
	PersonaSelectionCreateInput,
	PersonaSelectionRecord,
} from '@/domain/model-persona/ports.js'
import { CompositeQualityValidator } from './composite-quality-validator.js'
import { GenerateModelImageUseCase } from './generate-model-image.usecase.js'

class StubModelImageGenerator implements ModelImageGeneratorPort {
	public constructor(private readonly responses: ModelImageGenerationOutput[]) {}

	public async generateComposite(input: ModelImageGenerationInput): Promise<ModelImageGenerationOutput> {
		const response = this.responses[input.retryAttempt ?? 0] ?? this.responses[this.responses.length - 1]
		if (!response) {
			throw new Error('No stub response configured')
		}

		return response
	}
}

class InMemorySelectionRepository implements ModelPersonaSelectionRepository {
	public readonly records: PersonaSelectionRecord[] = []

	public async create(input: PersonaSelectionCreateInput): Promise<PersonaSelectionRecord> {
		const now = new Date('2026-02-13T00:00:00.000Z')
		const created: PersonaSelectionRecord = {
			id: `sel_${this.records.length + 1}`,
			userId: input.userId,
			jobId: input.jobId ?? null,
			presetId: input.presetId,
			generatedImageUrl: input.generatedImageUrl ?? null,
			qualityScore: input.qualityScore ?? null,
			createdAt: now,
			updatedAt: now,
		}

		this.records.push(created)
		return created
	}

	public async findByJobId(jobId: string): Promise<PersonaSelectionRecord | null> {
		return this.records.find((record) => record.jobId === jobId) ?? null
	}

	public async findByUserId(userId: string, limit: number, offset: number): Promise<{ items: PersonaSelectionRecord[]; total: number }> {
		const items = this.records.filter((record) => record.userId === userId)
		return {
			items: items.slice(offset, offset + limit),
			total: items.length,
		}
	}
}

const PRESET: PersonaPresetRecord = {
	id: 'preset_1',
	name: '여성 20대 캐주얼',
	gender: 'FEMALE',
	ageRange: 'YOUNG_ADULT',
	bodyType: 'SLIM',
	style: 'CASUAL',
	imagenPromptTemplate: '{{product_name}}',
	previewImageUrl: null,
	isActive: true,
	createdAt: new Date('2026-02-13T00:00:00.000Z'),
	updatedAt: new Date('2026-02-13T00:00:00.000Z'),
}

describe('model-persona/generate-model-image.usecase', () => {
	it('accepts generated image when quality passes', async () => {
		const generator = new StubModelImageGenerator([
			{
				imageUrl: 'https://cdn.example.com/composite-1.png',
				prompt: 'prompt-1',
				provider: 'GEMINI_IMAGEN',
				qualitySignals: {
					visibilityScore: 0.8,
					naturalnessScore: 0.82,
					artifactScore: 0.75,
				},
			},
		])
		const repository = new InMemorySelectionRepository()
		const useCase = new GenerateModelImageUseCase(
			generator,
			repository,
			new CompositeQualityValidator(0.6),
		)

		const result = await useCase.execute({
			userId: 'user_1',
			jobId: 'job_1',
			productImageUrl: 'https://cdn.example.com/product.png',
			productName: '플로럴 원피스',
			productCategory: ProductCategory.FASHION,
			productKeywords: ['floral', 'dress'],
			preset: PRESET,
		})

		expect(result.accepted).toBe(true)
		expect(result.fallbackToProductOnly).toBe(false)
		expect(repository.records).toHaveLength(1)
		expect(repository.records[0]?.qualityScore).not.toBeNull()
	})

	it('falls back to product-only after max retries', async () => {
		const generator = new StubModelImageGenerator([
			{
				imageUrl: 'https://cdn.example.com/composite-1.png',
				prompt: 'prompt-1',
				provider: 'GEMINI_IMAGEN',
				qualitySignals: {
					visibilityScore: 0.4,
					naturalnessScore: 0.45,
					artifactScore: 0.5,
				},
			},
			{
				imageUrl: 'https://cdn.example.com/composite-2.png',
				prompt: 'prompt-2',
				provider: 'GEMINI_IMAGEN',
				qualitySignals: {
					visibilityScore: 0.5,
					naturalnessScore: 0.5,
					artifactScore: 0.45,
				},
			},
			{
				imageUrl: 'https://cdn.example.com/composite-3.png',
				prompt: 'prompt-3',
				provider: 'GEMINI_IMAGEN',
				qualitySignals: {
					visibilityScore: 0.55,
					naturalnessScore: 0.5,
					artifactScore: 0.52,
				},
			},
		])
		const repository = new InMemorySelectionRepository()
		const useCase = new GenerateModelImageUseCase(
			generator,
			repository,
			new CompositeQualityValidator(0.7),
		)

		const result = await useCase.execute({
			userId: 'user_1',
			jobId: 'job_2',
			productImageUrl: 'https://cdn.example.com/product.png',
			productCategory: ProductCategory.FASHION,
			productKeywords: ['dress'],
			preset: PRESET,
		})

		expect(result.accepted).toBe(false)
		expect(result.fallbackToProductOnly).toBe(true)
		expect(result.message).toContain('모델 합성에 실패했습니다')
		expect(repository.records).toHaveLength(1)
	})
})
