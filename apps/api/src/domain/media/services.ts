import { PlanTier, Platform, type PlanTier as PlanTierType, type Platform as PlatformType } from '@1dragon/shared'
import type {
	CircuitBreakerPolicy,
	DailyPublishHealthPolicy,
	DailyPublishHealthSnapshot,
	MediaQueueName,
	MediaReliabilityPolicyPort,
	QueueDeadLetterPolicy,
	QueueRetryPolicy,
} from './ports.js'

type VariantDecision = {
	readonly planTier: PlanTierType
	readonly platforms: ReadonlyArray<PlatformType>
	readonly maxDurationSec: number
}

export class VariantPolicyService {
	public resolveVariants(planTier: PlanTierType): VariantDecision {
		if (planTier === PlanTier.STARTER) {
			return {
				planTier,
				platforms: [Platform.TIKTOK, Platform.YOUTUBE_SHORTS, Platform.INSTAGRAM_REELS],
				maxDurationSec: 30,
			}
		}

		return {
			planTier: PlanTier.FREE,
			platforms: [Platform.TIKTOK],
			maxDurationSec: 15,
		}
	}

	public shouldRenderWatermark(planTier: PlanTierType, includeWatermark: boolean): boolean {
		if (planTier === PlanTier.FREE) {
			return true
		}

		return includeWatermark
	}
}

const MEDIA_GENERATE_RETRY_POLICY: QueueRetryPolicy = {
	maxAttempts: 3,
	strategy: 'EXPONENTIAL',
	baseDelayMs: 1000,
	maxDelayMs: 30_000,
}

const MEDIA_GENERATE_DLQ_POLICY: QueueDeadLetterPolicy = {
	queueName: 'media-generate-dlq',
	retainFailedForHours: 24 * 30,
	routeReasons: [
		'MAX_ATTEMPTS_EXCEEDED',
		'NON_RETRYABLE_PROVIDER_ERROR',
		'PROVIDER_CHAIN_EXHAUSTED',
		'UNKNOWN',
	],
}

const DEFAULT_CIRCUIT_BREAKER_POLICY: CircuitBreakerPolicy = {
	failureThreshold: 3,
	openDurationMs: 30_000,
	halfOpenMaxCalls: 2,
	successThresholdToClose: 1,
}

const DEFAULT_DAILY_PUBLISH_HEALTH_POLICY: DailyPublishHealthPolicy = {
	lookbackHours: 24,
	targetSuccessCount: 3,
	warningBelowCount: 3,
	criticalBelowCount: 1,
	alertCooldownMinutes: 60,
}

export class MediaReliabilityPolicyService implements MediaReliabilityPolicyPort {
	public getQueueRetryPolicy(queue: MediaQueueName): QueueRetryPolicy {
		if (queue === 'MEDIA_GENERATE') {
			return MEDIA_GENERATE_RETRY_POLICY
		}

		return MEDIA_GENERATE_RETRY_POLICY
	}

	public getQueueDeadLetterPolicy(queue: MediaQueueName): QueueDeadLetterPolicy {
		if (queue === 'MEDIA_GENERATE') {
			return MEDIA_GENERATE_DLQ_POLICY
		}

		return MEDIA_GENERATE_DLQ_POLICY
	}

	public getCircuitBreakerPolicy(): CircuitBreakerPolicy {
		return DEFAULT_CIRCUIT_BREAKER_POLICY
	}

	public getDailyPublishHealthPolicy(): DailyPublishHealthPolicy {
		return DEFAULT_DAILY_PUBLISH_HEALTH_POLICY
	}

	public resolveBackoffDelayMs(input: {
		attempt: number
		queue: MediaQueueName
	}): number {
		const policy = this.getQueueRetryPolicy(input.queue)
		const normalizedAttempt = Math.max(1, Math.floor(input.attempt))
		const exponential = policy.baseDelayMs * 2 ** (normalizedAttempt - 1)
		return Math.min(policy.maxDelayMs, exponential)
	}
}

export class DailyPublishHealthService {
	public constructor(
		private readonly policy: DailyPublishHealthPolicy = new MediaReliabilityPolicyService().getDailyPublishHealthPolicy(),
	) {}

	public evaluate(succeededCount: number): DailyPublishHealthSnapshot {
		const normalizedSucceededCount = Math.max(0, Math.floor(succeededCount))
		const targetCount = this.policy.targetSuccessCount
		const missingCount = Math.max(0, targetCount - normalizedSucceededCount)

		if (normalizedSucceededCount >= targetCount) {
			return {
				status: 'HEALTHY',
				succeededCount: normalizedSucceededCount,
				targetCount,
				missingCount: 0,
				shouldAlert: false,
			}
		}

		const status =
			normalizedSucceededCount <= this.policy.criticalBelowCount ? 'UNHEALTHY' : 'AT_RISK'

		return {
			status,
			succeededCount: normalizedSucceededCount,
			targetCount,
			missingCount,
			shouldAlert: normalizedSucceededCount < this.policy.warningBelowCount,
		}
	}

	public canAlertNow(input: {
		lastAlertedAt: Date | null
		now?: Date
	}): boolean {
		if (!input.lastAlertedAt) {
			return true
		}

		const now = input.now ?? new Date()
		const elapsedMs = now.getTime() - input.lastAlertedAt.getTime()
		const cooldownMs = this.policy.alertCooldownMinutes * 60_000
		return elapsedMs >= cooldownMs
	}
}
