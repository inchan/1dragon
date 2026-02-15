import { describe, expect, it } from 'vitest'
import { CompositeQualityValidator } from './composite-quality-validator.js'

describe('model-persona/composite-quality-validator', () => {
	it('passes when score is above threshold', () => {
		const validator = new CompositeQualityValidator(0.6)
		const result = validator.evaluate({
			visibilityScore: 0.9,
			naturalnessScore: 0.8,
			artifactScore: 0.7,
		})

		expect(result.passed).toBe(true)
		expect(result.score).toBeGreaterThanOrEqual(0.6)
	})

	it('returns adjustment hint based on weakest signal', () => {
		const validator = new CompositeQualityValidator(0.6)
		const hint = validator.buildAdjustmentHint({
			visibilityScore: 0.45,
			naturalnessScore: 0.8,
			artifactScore: 0.8,
		})

		expect(hint).toContain('visibility')
	})
})
