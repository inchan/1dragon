type QuotaCheckInput = {
	remainingCredits: number
	creditsToConsume?: number
	estimatedCostUsd: number
	remainingBudgetUsd: number
}

export class QuotaExceededError extends Error {
	public constructor() {
		super('이번 달 영상 생성 한도를 모두 사용했습니다')
		this.name = 'QuotaExceededError'
	}
}

export class BudgetExceededError extends Error {
	public constructor() {
		super('비용 한도에 도달했습니다')
		this.name = 'BudgetExceededError'
	}
}

export class QuotaPolicy {
	public static assertQuota(input: QuotaCheckInput): void {
		const creditsToConsume = input.creditsToConsume ?? 1

		if (input.remainingCredits < creditsToConsume) {
			throw new QuotaExceededError()
		}

		if (input.estimatedCostUsd > input.remainingBudgetUsd) {
			throw new BudgetExceededError()
		}
	}

	public static consumeCredits(remainingCredits: number, amount = 1): number {
		if (amount < 0) {
			throw new RangeError('credit amount must be non-negative')
		}

		return Math.max(0, remainingCredits - amount)
	}
}

type WatermarkBonusInput = {
	planTier: 'FREE' | 'STARTER'
	includeWatermark: boolean
	currentBonusCredits: number
	maxMonthlyBonus?: number
}

export class WatermarkIncentivePolicy {
	public static grantBonus(input: WatermarkBonusInput): { granted: boolean; nextBonusCredits: number } {
		const maxMonthlyBonus = input.maxMonthlyBonus ?? 5
		const isStarter = input.planTier === 'STARTER'

		if (!isStarter || !input.includeWatermark) {
			return {
				granted: false,
				nextBonusCredits: input.currentBonusCredits,
			}
		}

		if (input.currentBonusCredits >= maxMonthlyBonus) {
			return {
				granted: false,
				nextBonusCredits: input.currentBonusCredits,
			}
		}

		return {
			granted: true,
			nextBonusCredits: input.currentBonusCredits + 1,
		}
	}
}
