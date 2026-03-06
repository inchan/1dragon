import { ProductCategory } from '@1dragon/shared'
import { describe, expect, it } from 'vitest'
import { PersonaCategoryMatcher } from './services.js'

describe('model-persona/services', () => {
	it('shows model selector for eligible categories', () => {
		const matcher = new PersonaCategoryMatcher()

		expect(
			matcher.shouldShowModelSelector({
				detectedCategory: ProductCategory.FASHION,
			}),
		).toBe(true)
		expect(
			matcher.shouldShowModelSelector({
				detectedCategory: ProductCategory.ACCESSORIES,
			}),
		).toBe(true)
	})

	it('hides model selector for non-eligible categories', () => {
		const matcher = new PersonaCategoryMatcher()

		expect(
			matcher.shouldShowModelSelector({
				detectedCategory: ProductCategory.ELECTRONICS,
			}),
		).toBe(false)
	})

	it('uses overridden category first', () => {
		const matcher = new PersonaCategoryMatcher()

		expect(
			matcher.shouldShowModelSelector({
				detectedCategory: ProductCategory.OTHER,
				overriddenCategory: ProductCategory.BEAUTY,
			}),
		).toBe(true)
	})
})
