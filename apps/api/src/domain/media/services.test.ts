import { PlanTier } from '@snapvid/shared'
import { describe, expect, it } from 'vitest'
import { VariantPolicyService } from './services.js'

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
})
