import { describe, expect, it } from 'vitest'
import { QualityControlService } from './quality-control.js'

describe('QualityControlService', () => {
	it('evaluates similarity score and pass/fail', () => {
		const service = new QualityControlService(0.7)
		const evaluation = service.evaluate({
			originalImageUrl: 'https://cdn.example.com/original.png',
			generatedVideoUrl: 'https://cdn.example.com/video.mp4',
		})

		expect(evaluation.similarityScore).toBeGreaterThanOrEqual(0.6)
		expect(evaluation.similarityScore).toBeLessThanOrEqual(0.99)
		expect(typeof evaluation.passed).toBe('boolean')
	})

	it('determines regeneration condition', () => {
		const service = new QualityControlService(0.7)

		expect(
			service.shouldRegenerate({
				similarityScore: 0.65,
				retryCount: 0,
				maxRetries: 2,
			}),
		).toBe(true)

		expect(
			service.shouldRegenerate({
				similarityScore: 0.8,
				retryCount: 0,
				maxRetries: 2,
			}),
		).toBe(false)
	})
})
