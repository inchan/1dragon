import { PlanTier } from '@1dragon/shared'
import { describe, expect, it } from 'vitest'
import { DailyPublishHealthService, MediaReliabilityPolicyService, VariantPolicyService } from './services.js'

describe('media/services', () => {
	it('returns one platform for free plan', () => {
		const policy = new VariantPolicyService()
		const result = policy.resolveVariants(PlanTier.FREE)

		expect(result.platforms).toEqual(['TIKTOK'])
		expect(result.maxDurationSec).toBe(15)
	})

	it('returns three platforms for starter plan', () => {
		const policy = new VariantPolicyService()
		const result = policy.resolveVariants(PlanTier.STARTER)

		expect(result.platforms).toEqual(['TIKTOK', 'YOUTUBE_SHORTS', 'INSTAGRAM_REELS'])
		expect(result.maxDurationSec).toBe(30)
	})

	it('forces watermark for free plan', () => {
		const policy = new VariantPolicyService()

		expect(policy.shouldRenderWatermark(PlanTier.FREE, false)).toBe(true)
		expect(policy.shouldRenderWatermark(PlanTier.STARTER, false)).toBe(false)
		expect(policy.shouldRenderWatermark(PlanTier.STARTER, true)).toBe(true)
	})

	it('returns locked reliability contracts for media generation queue', () => {
		const reliability = new MediaReliabilityPolicyService()
		const retry = reliability.getQueueRetryPolicy('MEDIA_GENERATE')
		const deadLetter = reliability.getQueueDeadLetterPolicy('MEDIA_GENERATE')
		const circuit = reliability.getCircuitBreakerPolicy()
		const health = reliability.getDailyPublishHealthPolicy()

		expect(retry).toEqual({
			maxAttempts: 3,
			strategy: 'EXPONENTIAL',
			baseDelayMs: 1000,
			maxDelayMs: 30_000,
		})
		expect(deadLetter.queueName).toBe('media-generate-dlq')
		expect(deadLetter.routeReasons).toContain('PROVIDER_CHAIN_EXHAUSTED')
		expect(circuit.failureThreshold).toBe(3)
		expect(circuit.openDurationMs).toBe(30_000)
		expect(health.targetSuccessCount).toBe(3)
	})

	it('calculates exponential backoff delay with max cap', () => {
		const reliability = new MediaReliabilityPolicyService()

		expect(reliability.resolveBackoffDelayMs({ queue: 'MEDIA_GENERATE', attempt: 1 })).toBe(1000)
		expect(reliability.resolveBackoffDelayMs({ queue: 'MEDIA_GENERATE', attempt: 2 })).toBe(2000)
		expect(reliability.resolveBackoffDelayMs({ queue: 'MEDIA_GENERATE', attempt: 6 })).toBe(30_000)
	})

	it('marks daily publish health as healthy at 3 or more successes', () => {
		const healthService = new DailyPublishHealthService()
		const result = healthService.evaluate(3)

		expect(result.status).toBe('HEALTHY')
		expect(result.shouldAlert).toBe(false)
		expect(result.missingCount).toBe(0)
	})

	it('marks daily publish health as alertable when below target', () => {
		const healthService = new DailyPublishHealthService()
		const result = healthService.evaluate(1)

		expect(result.status).toBe('UNHEALTHY')
		expect(result.shouldAlert).toBe(true)
		expect(result.missingCount).toBe(2)
	})

	it('respects alert cooldown window', () => {
		const healthService = new DailyPublishHealthService()
		const lastAlertedAt = new Date('2026-02-24T10:00:00.000Z')

		expect(
			healthService.canAlertNow({
				lastAlertedAt,
				now: new Date('2026-02-24T10:30:00.000Z'),
			}),
		).toBe(false)
		expect(
			healthService.canAlertNow({
				lastAlertedAt,
				now: new Date('2026-02-24T11:01:00.000Z'),
			}),
		).toBe(true)
	})
})
