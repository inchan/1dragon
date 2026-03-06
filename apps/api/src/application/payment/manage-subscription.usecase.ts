import { PlanTier, SubscriptionStatus } from '@1dragon/shared'
import { EntitlementSnapshot, Subscription } from '@/domain/payment/entities.js'

type ManageSubscriptionAction =
	| { type: 'UPGRADE_TO_STARTER' }
	| { type: 'DOWNGRADE_TO_FREE' }
	| { type: 'RENEW'; periodStart: Date; periodEnd: Date }
	| { type: 'PAYMENT_FAILED' }
	| { type: 'CANCEL' }
	| { type: 'EXPIRE' }

type ManageSubscriptionResult = {
	subscription: Subscription
	snapshot: EntitlementSnapshot
}

export class ManageSubscriptionUseCase {
	public execute(
		subscription: Subscription,
		action: ManageSubscriptionAction,
	): ManageSubscriptionResult {
		switch (action.type) {
			case 'UPGRADE_TO_STARTER':
				return this.upgradeToStarter(subscription)
			case 'DOWNGRADE_TO_FREE':
				return this.downgradeToFree(subscription)
			case 'RENEW':
				return this.renew(subscription, action.periodStart, action.periodEnd)
			case 'PAYMENT_FAILED':
				subscription.transitionTo(SubscriptionStatus.PAST_DUE)
				return this.toResult(subscription)
			case 'CANCEL':
				subscription.requestCancellation()
				return this.toResult(subscription)
			case 'EXPIRE':
				subscription.transitionTo(SubscriptionStatus.EXPIRED)
				return this.toResult(subscription)
		}
	}

	private upgradeToStarter(subscription: Subscription): ManageSubscriptionResult {
		const upgraded = new Subscription({
			...subscription,
			planTier: PlanTier.STARTER,
			status: SubscriptionStatus.ACTIVE,
			remainingCredits: EntitlementSnapshot.fromPlanTier(PlanTier.STARTER).monthlyQuota,
			watermarkBonusCreditsEarned: 0,
		})

		return this.toResult(upgraded)
	}

	private downgradeToFree(subscription: Subscription): ManageSubscriptionResult {
		const downgraded = new Subscription({
			...subscription,
			planTier: PlanTier.FREE,
			status: SubscriptionStatus.ACTIVE,
			remainingCredits: EntitlementSnapshot.fromPlanTier(PlanTier.FREE).monthlyQuota,
			watermarkBonusCreditsEarned: 0,
		})

		return this.toResult(downgraded)
	}

	private renew(
		subscription: Subscription,
		periodStart: Date,
		periodEnd: Date,
	): ManageSubscriptionResult {
		const snapshot = EntitlementSnapshot.fromPlanTier(subscription.planTier)

		// 이월 불가 정책: 매 주기 갱신 시 잔여 크레딧은 버리고 기본 쿼터로 리셋
		subscription.renew(periodStart, periodEnd, snapshot.monthlyQuota)

		return this.toResult(subscription)
	}

	private toResult(subscription: Subscription): ManageSubscriptionResult {
		return {
			subscription,
			snapshot: EntitlementSnapshot.fromPlanTier(subscription.planTier),
		}
	}
}
