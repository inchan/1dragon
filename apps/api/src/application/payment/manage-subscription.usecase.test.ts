import { PlanTier, SubscriptionStatus } from '@1dragon/shared'
import { describe, expect, it } from 'vitest'
import { Subscription } from '@/domain/payment/entities.js'
import { ManageSubscriptionUseCase } from './manage-subscription.usecase.js'

function buildStarterSubscription(overrides?: Partial<Subscription>): Subscription {
	return new Subscription({
		id: 'sub_1',
		userId: 'user_1',
		planTier: PlanTier.STARTER,
		status: SubscriptionStatus.ACTIVE,
		billingCycle: 'MONTHLY',
		currentPeriodStart: new Date('2026-02-01T00:00:00.000Z'),
		currentPeriodEnd: new Date('2026-03-01T00:00:00.000Z'),
		remainingCredits: 3,
		watermarkBonusCreditsEarned: 2,
		...overrides,
	})
}

describe('ManageSubscriptionUseCase', () => {
	it('renews with no rollover policy', () => {
		const useCase = new ManageSubscriptionUseCase()
		const subscription = buildStarterSubscription()

		const result = useCase.execute(subscription, {
			type: 'RENEW',
			periodStart: new Date('2026-03-01T00:00:00.000Z'),
			periodEnd: new Date('2026-04-01T00:00:00.000Z'),
		})

		expect(result.subscription.remainingCredits).toBe(30)
		expect(result.subscription.watermarkBonusCreditsEarned).toBe(0)
		expect(result.subscription.status).toBe(SubscriptionStatus.ACTIVE)
	})

	it('upgrades to starter entitlements', () => {
		const useCase = new ManageSubscriptionUseCase()
		const freeSubscription = buildStarterSubscription({ planTier: PlanTier.FREE, remainingCredits: 0 })

		const result = useCase.execute(freeSubscription, { type: 'UPGRADE_TO_STARTER' })

		expect(result.subscription.planTier).toBe(PlanTier.STARTER)
		expect(result.subscription.remainingCredits).toBe(30)
		expect(result.snapshot.multiPlatformEnabled).toBe(true)
	})

	it('moves to past_due on payment failure', () => {
		const useCase = new ManageSubscriptionUseCase()
		const subscription = buildStarterSubscription()

		const result = useCase.execute(subscription, { type: 'PAYMENT_FAILED' })

		expect(result.subscription.status).toBe(SubscriptionStatus.PAST_DUE)
	})
})
