import { PlanTier, SubscriptionStatus, type PlanTier as PlanTierType } from '@1dragon/shared'

type BillingCycle = 'MONTHLY' | 'YEARLY'

type EntitlementSnapshotInput = {
	planTier: PlanTierType
	monthlyQuota: number
	maxVideoLengthSec: number
	watermarkRequired: boolean
	multiPlatformEnabled: boolean
	bgmLibraryTier: 'BASIC' | 'PREMIUM'
	ttsVoiceCount: number
}

export class EntitlementSnapshot {
	public readonly planTier: PlanTierType
	public readonly monthlyQuota: number
	public readonly maxVideoLengthSec: number
	public readonly watermarkRequired: boolean
	public readonly multiPlatformEnabled: boolean
	public readonly bgmLibraryTier: 'BASIC' | 'PREMIUM'
	public readonly ttsVoiceCount: number

	public constructor(input: EntitlementSnapshotInput) {
		this.planTier = input.planTier
		this.monthlyQuota = input.monthlyQuota
		this.maxVideoLengthSec = input.maxVideoLengthSec
		this.watermarkRequired = input.watermarkRequired
		this.multiPlatformEnabled = input.multiPlatformEnabled
		this.bgmLibraryTier = input.bgmLibraryTier
		this.ttsVoiceCount = input.ttsVoiceCount
	}

	public static fromPlanTier(planTier: PlanTierType): EntitlementSnapshot {
		if (planTier === PlanTier.STARTER) {
			return new EntitlementSnapshot({
				planTier: PlanTier.STARTER,
				monthlyQuota: 30,
				maxVideoLengthSec: 30,
				watermarkRequired: false,
				multiPlatformEnabled: true,
				bgmLibraryTier: 'PREMIUM',
				ttsVoiceCount: 3,
			})
		}

		return new EntitlementSnapshot({
			planTier: PlanTier.FREE,
			monthlyQuota: 3,
			maxVideoLengthSec: 15,
			watermarkRequired: true,
			multiPlatformEnabled: false,
			bgmLibraryTier: 'BASIC',
			ttsVoiceCount: 1,
		})
	}
}

type SubscriptionInput = {
	id: string
	userId: string
	planTier: PlanTierType
	status: keyof typeof SubscriptionStatus
	billingCycle: BillingCycle
	currentPeriodStart: Date
	currentPeriodEnd: Date
	cancelAtPeriodEnd?: boolean
	remainingCredits: number
	watermarkBonusCreditsEarned?: number
}

const ALLOWED_STATUS_TRANSITIONS: Readonly<Record<keyof typeof SubscriptionStatus, readonly (keyof typeof SubscriptionStatus)[]>> =
	{
		TRIAL: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED],
		ACTIVE: [SubscriptionStatus.PAST_DUE, SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED],
		PAST_DUE: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED],
		CANCELLED: [SubscriptionStatus.EXPIRED, SubscriptionStatus.ACTIVE],
		EXPIRED: [SubscriptionStatus.ACTIVE],
	}

export class InvalidSubscriptionTransitionError extends Error {
	public constructor(from: keyof typeof SubscriptionStatus, to: keyof typeof SubscriptionStatus) {
		super(`Invalid subscription status transition: ${from} -> ${to}`)
		this.name = 'InvalidSubscriptionTransitionError'
	}
}

export class Subscription {
	public readonly id: string
	public readonly userId: string
	public readonly planTier: PlanTierType
	public status: keyof typeof SubscriptionStatus
	public readonly billingCycle: BillingCycle
	public currentPeriodStart: Date
	public currentPeriodEnd: Date
	public cancelAtPeriodEnd: boolean
	public remainingCredits: number
	public watermarkBonusCreditsEarned: number

	public constructor(input: SubscriptionInput) {
		this.id = input.id
		this.userId = input.userId
		this.planTier = input.planTier
		this.status = input.status
		this.billingCycle = input.billingCycle
		this.currentPeriodStart = input.currentPeriodStart
		this.currentPeriodEnd = input.currentPeriodEnd
		this.cancelAtPeriodEnd = input.cancelAtPeriodEnd ?? false
		this.remainingCredits = input.remainingCredits
		this.watermarkBonusCreditsEarned = input.watermarkBonusCreditsEarned ?? 0
	}

	public canTransitionTo(nextStatus: keyof typeof SubscriptionStatus): boolean {
		return ALLOWED_STATUS_TRANSITIONS[this.status].includes(nextStatus)
	}

	public transitionTo(nextStatus: keyof typeof SubscriptionStatus): void {
		if (!this.canTransitionTo(nextStatus)) {
			throw new InvalidSubscriptionTransitionError(this.status, nextStatus)
		}
		this.status = nextStatus
	}

	public requestCancellation(): void {
		this.cancelAtPeriodEnd = true
		this.transitionTo(SubscriptionStatus.CANCELLED)
	}

	public renew(nextPeriodStart: Date, nextPeriodEnd: Date, baseQuota: number): void {
		this.currentPeriodStart = nextPeriodStart
		this.currentPeriodEnd = nextPeriodEnd
		this.cancelAtPeriodEnd = false
		this.status = SubscriptionStatus.ACTIVE
		this.remainingCredits = baseQuota
		this.watermarkBonusCreditsEarned = 0
	}

	public consumeCredit(amount = 1): void {
		this.remainingCredits = Math.max(0, this.remainingCredits - amount)
	}

	public increaseWatermarkBonus(maxMonthlyBonus: number): boolean {
		if (this.watermarkBonusCreditsEarned >= maxMonthlyBonus) {
			return false
		}

		this.watermarkBonusCreditsEarned += 1
		this.remainingCredits += 1
		return true
	}
}
