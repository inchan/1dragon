import { describe, expect, it } from 'vitest'
import {
	clampNarrationSpeed,
	createDefaultCopyVariants,
	selectCopyVariantById,
} from './model'

describe('content-generation model helpers', () => {
	it('creates three copy variants', () => {
		const variants = createDefaultCopyVariants('원피스')

		expect(variants).toHaveLength(3)
		expect(variants[0]?.hookCopy).toContain('원피스')
	})

	it('selects variant by id and falls back to first variant', () => {
		const variants = createDefaultCopyVariants('가방')
		const selected = selectCopyVariantById(variants, 'copy-2')
		const fallback = selectCopyVariantById(variants, 'unknown')

		expect(selected.id).toBe('copy-2')
		expect(fallback.id).toBe('copy-1')
	})

	it('clamps narration speed in valid range', () => {
		expect(clampNarrationSpeed(0.2)).toBe(0.8)
		expect(clampNarrationSpeed(1.2)).toBe(1.2)
		expect(clampNarrationSpeed(2.3)).toBe(1.5)
	})
})
