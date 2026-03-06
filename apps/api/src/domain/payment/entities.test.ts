import { PlanTier, SubscriptionStatus } from '@1dragon/shared'
import { describe, expect, it } from 'vitest'
import { EntitlementSnapshot, InvalidSubscriptionTransitionError, Subscription } from './entities.js'

describe('payment/entities', () => {
	it('creates entitlement snapshot from starter plan', () => {
		const snapshot = EntitlementSnapshot.fromPlanTier(PlanTier.STARTER)

		expect(snapshot.planTier).toBe(PlanTier.STARTER)
		expect(snapshot.monthlyQuota).toBe(30)
		expect(snapshot.multiPlatformEnabled).toBe(true)
		expect(snapshot.ttsVoiceCount).toBe(3)
	})

	it('enforces subscription state machine transition', () => {
		const subscription = new Subscription({
			id: 'sub_1',
			userId: 'user_1',
			planTier: PlanTier.STARTER,
			status: SubscriptionStatus.ACTIVE,
			billingCycle: 'MONTHLY',
			currentPeriodStart: new Date('2026-02-01T00:00:00.000Z'),
			currentPeriodEnd: new Date('2026-03-01T00:00:00.000Z'),
			remainingCredits: 30,
		})

		subscription.transitionTo(SubscriptionStatus.PAST_DUE)
		expect(subscription.status).toBe(SubscriptionStatus.PAST_DUE)

		expect(() => {
			subscription.transitionTo(SubscriptionStatus.TRIAL)
		}).toThrow(InvalidSubscriptionTransitionError)
	})

	it('renews subscription and resets monthly bonus credits', () => {
		const subscription = new Subscription({
			id: 'sub_1',
			userId: 'user_1',
			planTier: PlanTier.STARTER,
			status: SubscriptionStatus.PAST_DUE,
			billingCycle: 'MONTHLY',
			currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
			currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
			remainingCredits: 2,
			watermarkBonusCreditsEarned: 4,
		})

		subscription.renew(
			new Date('2026-02-01T00:00:00.000Z'),
			new Date('2026-03-01T00:00:00.000Z'),
			30,
		)

		expect(subscription.status).toBe(SubscriptionStatus.ACTIVE)
		expect(subscription.remainingCredits).toBe(30)
		expect(subscription.watermarkBonusCreditsEarned).toBe(0)
	})
})
