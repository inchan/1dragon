import { and, eq, lte } from 'drizzle-orm'
import { db } from '@/infrastructure/persistence/db.js'
import { subscriptions } from '@/infrastructure/persistence/schema.js'
import { logger } from '@/infrastructure/logging/index.js'

const MAX_RETRY_COUNT = 3
const RETRY_INTERVAL_MS = 24 * 60 * 60 * 1000

let timer: NodeJS.Timeout | null = null

export async function processDuePaymentRetries(now = new Date()): Promise<number> {
	const due = await db
		.select()
		.from(subscriptions)
		.where(
			and(
				eq(subscriptions.status, 'PAST_DUE'),
				lte(subscriptions.nextRetryAt, now),
				lte(subscriptions.paymentRetryCount, MAX_RETRY_COUNT),
			),
		)

	let processed = 0

	for (const sub of due) {
		const nextRetryCount = sub.paymentRetryCount + 1
		const shouldExpire = nextRetryCount >= MAX_RETRY_COUNT

		await db
			.update(subscriptions)
			.set({
				paymentRetryCount: nextRetryCount,
				nextRetryAt: shouldExpire ? null : new Date(now.getTime() + RETRY_INTERVAL_MS),
				status: shouldExpire ? 'EXPIRED' : 'PAST_DUE',
				updatedAt: now,
			})
			.where(eq(subscriptions.id, sub.id))

		processed += 1
	}

	if (processed > 0) {
		logger.info({ processed }, 'Processed due payment retry jobs')
	}

	return processed
}

export function initializeSubscriptionRetryScheduler(): void {
	if (timer) {
		return
	}

	timer = setInterval(() => {
		processDuePaymentRetries().catch((error) => {
			logger.error(
				{ error: error instanceof Error ? error.message : String(error) },
				'Failed to process payment retries',
			)
		})
	}, 60 * 60 * 1000)

	logger.info('Subscription retry scheduler initialized (hourly)')
}

export async function closeSubscriptionRetryScheduler(): Promise<void> {
	if (!timer) {
		return
	}

	clearInterval(timer)
	timer = null
	logger.info('Subscription retry scheduler closed')
}
