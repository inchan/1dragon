import { randomUUID } from 'node:crypto'
import { ProductCategory } from '@snapvid/shared'
import { describe, expect, it } from 'vitest'
import type {
	ModelPersonaPresetRepository,
	PersonaPresetRecord,
} from '@/domain/model-persona/ports.js'
import { SelectPersonaUseCase } from './select-persona.usecase.js'

class InMemoryPresetRepository implements ModelPersonaPresetRepository {
	public constructor(private readonly presets: PersonaPresetRecord[]) {}

	public async listActive(): Promise<PersonaPresetRecord[]> {
		return this.presets
	}

	public async findById(id: string): Promise<PersonaPresetRecord | null> {
		return this.presets.find((preset) => preset.id === id) ?? null
	}
}

function buildPreset(overrides: Partial<PersonaPresetRecord> = {}): PersonaPresetRecord {
	const now = new Date('2026-02-13T00:00:00.000Z')

	return {
		id: overrides.id ?? randomUUID(),
		name: overrides.name ?? 'preset',
		gender: overrides.gender ?? 'FEMALE',
		ageRange: overrides.ageRange ?? 'YOUNG_ADULT',
		bodyType: overrides.bodyType ?? 'REGULAR',
		style: overrides.style ?? 'CASUAL',
		imagenPromptTemplate: overrides.imagenPromptTemplate ?? 'template',
		previewImageUrl: overrides.previewImageUrl ?? null,
		isActive: overrides.isActive ?? true,
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
	}
}

describe('model-persona/select-persona.usecase', () => {
	it('returns top 3 recommendations for eligible category', async () => {
		const repository = new InMemoryPresetRepository([
			buildPreset({ id: 'a', name: 'f-casual-20', gender: 'FEMALE', ageRange: 'YOUNG_ADULT', style: 'CASUAL' }),
			buildPreset({ id: 'b', name: 'f-minimal-30', gender: 'FEMALE', ageRange: 'ADULT', style: 'MINIMAL' }),
			buildPreset({ id: 'c', name: 'm-formal-30', gender: 'MALE', ageRange: 'ADULT', style: 'FORMAL' }),
			buildPreset({ id: 'd', name: 'f-street-20', gender: 'FEMALE', ageRange: 'YOUNG_ADULT', style: 'STREET' }),
		])
		const useCase = new SelectPersonaUseCase(repository)

		const result = await useCase.execute({
			detectedCategory: ProductCategory.FASHION,
			targetAudience: '20대 여성 캐주얼 룩',
		})

		expect(result.showModelSelector).toBe(true)
		expect(result.recommendations).toHaveLength(3)
		expect(result.recommendations[0]?.id).toBe('a')
	})

	it('returns empty recommendation when category is not eligible', async () => {
		const repository = new InMemoryPresetRepository([buildPreset({ id: 'a' })])
		const useCase = new SelectPersonaUseCase(repository)

		const result = await useCase.execute({
			detectedCategory: ProductCategory.FOOD,
			targetAudience: '30대 남성',
		})

		expect(result.showModelSelector).toBe(false)
		expect(result.recommendations).toHaveLength(0)
	})

	it('prioritizes overridden category when provided', async () => {
		const repository = new InMemoryPresetRepository([buildPreset({ id: 'a' })])
		const useCase = new SelectPersonaUseCase(repository)

		const result = await useCase.execute({
			detectedCategory: ProductCategory.OTHER,
			overriddenCategory: ProductCategory.BEAUTY,
		})

		expect(result.resolvedCategory).toBe(ProductCategory.BEAUTY)
		expect(result.showModelSelector).toBe(true)
	})
})
