import { describe, expect, it } from 'vitest'
import {
	BudgetExceededError,
	QuotaExceededError,
	QuotaPolicy,
	WatermarkIncentivePolicy,
} from './policies.js'

describe('payment/policies', () => {
	describe('QuotaPolicy', () => {
		it('throws quota error when credits are insufficient', () => {
			expect(() => {
				QuotaPolicy.assertQuota({
					remainingCredits: 0,
					estimatedCostUsd: 0.5,
					remainingBudgetUsd: 100,
				})
			}).toThrow(QuotaExceededError)
		})

		it('throws budget error when estimated cost exceeds budget', () => {
			expect(() => {
				QuotaPolicy.assertQuota({
					remainingCredits: 3,
					estimatedCostUsd: 120,
					remainingBudgetUsd: 100,
				})
			}).toThrow(BudgetExceededError)
		})

		it('consumes credits safely', () => {
			expect(QuotaPolicy.consumeCredits(3, 1)).toBe(2)
			expect(QuotaPolicy.consumeCredits(1, 3)).toBe(0)
		})
	})

	describe('WatermarkIncentivePolicy', () => {
		it('grants starter user bonus when watermark is included', () => {
			const result = WatermarkIncentivePolicy.grantBonus({
				planTier: 'STARTER',
				includeWatermark: true,
				currentBonusCredits: 2,
			})

			expect(result).toEqual({
				granted: true,
				nextBonusCredits: 3,
			})
		})

		it('does not grant bonus after monthly cap', () => {
			const result = WatermarkIncentivePolicy.grantBonus({
				planTier: 'STARTER',
				includeWatermark: true,
				currentBonusCredits: 5,
			})

			expect(result).toEqual({
				granted: false,
				nextBonusCredits: 5,
			})
		})

		it('does not grant bonus to free plan', () => {
			const result = WatermarkIncentivePolicy.grantBonus({
				planTier: 'FREE',
				includeWatermark: true,
				currentBonusCredits: 0,
			})

			expect(result).toEqual({
				granted: false,
				nextBonusCredits: 0,
			})
		})
	})
})
