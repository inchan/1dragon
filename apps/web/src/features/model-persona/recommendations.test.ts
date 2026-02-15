import { ProductCategory } from '@snapvid/shared'
import { describe, expect, it } from 'vitest'
import {
	buildPersonaCatalog,
	isModelEligibleCategory,
	recommendPersonaOptions,
	resolvePersonaSelection,
} from './recommendations'

describe('features/model-persona/recommendations', () => {
	it('builds 48 persona preset combinations', () => {
		const catalog = buildPersonaCatalog()

		expect(catalog).toHaveLength(48)
	})

	it('matches eligible category', () => {
		expect(isModelEligibleCategory(ProductCategory.FASHION)).toBe(true)
		expect(isModelEligibleCategory(ProductCategory.FOOD)).toBe(false)
	})

	it('returns three recommendations sorted by audience hints', () => {
		const catalog = buildPersonaCatalog()
		const recommendations = recommendPersonaOptions({
			category: ProductCategory.FASHION,
			targetAudience: '20대 여성 캐주얼 룩',
			catalog,
		})

		expect(recommendations).toHaveLength(3)
		expect(recommendations[0]?.gender).toBe('FEMALE')
		expect(recommendations[0]?.ageRange).toBe('YOUNG_ADULT')
	})

	it('resolves selection to a catalog option', () => {
		const catalog = buildPersonaCatalog()
		const selected = resolvePersonaSelection(catalog, {
			gender: 'MALE',
			ageRange: 'ADULT',
			bodyType: 'REGULAR',
			style: 'FORMAL',
		})

		expect(selected.id).toBe('MALE-ADULT-REGULAR-FORMAL')
	})
})
