import { QuotaPolicy } from '@/domain/payment/policies.js'

type CheckQuotaInput = {
	remainingCredits: number
	estimatedCostUsd: number
	remainingBudgetUsd: number
	creditsToConsume?: number
}

type CheckQuotaResult = {
	allowed: true
	nextRemainingCredits: number
}

export class CheckQuotaUseCase {
	public execute(input: CheckQuotaInput): CheckQuotaResult {
		const quotaInput = {
			remainingCredits: input.remainingCredits,
			estimatedCostUsd: input.estimatedCostUsd,
			remainingBudgetUsd: input.remainingBudgetUsd,
		}

		if (input.creditsToConsume !== undefined) {
			Object.assign(quotaInput, { creditsToConsume: input.creditsToConsume })
		}

		QuotaPolicy.assertQuota(quotaInput)

		const creditsToConsume = input.creditsToConsume ?? 1
		return {
			allowed: true,
			nextRemainingCredits: QuotaPolicy.consumeCredits(input.remainingCredits, creditsToConsume),
		}
	}
}
