import { describe, expect, it } from 'vitest'
import { BudgetExceededError, QuotaExceededError } from '@/domain/payment/policies.js'
import { CheckQuotaUseCase } from './check-quota.usecase.js'

describe('CheckQuotaUseCase', () => {
	it('returns next remaining credits when allowed', () => {
		const useCase = new CheckQuotaUseCase()

		const result = useCase.execute({
			remainingCredits: 3,
			estimatedCostUsd: 0.93,
			remainingBudgetUsd: 10,
		})

		expect(result.allowed).toBe(true)
		expect(result.nextRemainingCredits).toBe(2)
	})

	it('throws when credits are exhausted', () => {
		const useCase = new CheckQuotaUseCase()

		expect(() => {
			useCase.execute({
				remainingCredits: 0,
				estimatedCostUsd: 0.93,
				remainingBudgetUsd: 10,
			})
		}).toThrow(QuotaExceededError)
	})

	it('throws when estimated budget is exceeded', () => {
		const useCase = new CheckQuotaUseCase()

		expect(() => {
			useCase.execute({
				remainingCredits: 3,
				estimatedCostUsd: 12,
				remainingBudgetUsd: 10,
			})
		}).toThrow(BudgetExceededError)
	})
})
