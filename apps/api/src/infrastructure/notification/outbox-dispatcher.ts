import { and, asc, eq } from 'drizzle-orm'
import { NotificationEvent, jobStatusChangedEventSchema } from '@/domain/notification/entities.js'
import { logger } from '@/infrastructure/logging/index.js'
import { db } from '@/infrastructure/persistence/db.js'
import { jobEvents } from '@/infrastructure/persistence/schema.js'
import { sseBroker } from './sse-broker.js'

let timer: NodeJS.Timeout | null = null
const DISPATCH_INTERVAL_MS = 5_000

export async function dispatchOutboxEvents(): Promise<number> {
	const events = await db
		.select()
		.from(jobEvents)
		.where(and(eq(jobEvents.processed, false), eq(jobEvents.eventType, 'JOB_STATUS_CHANGED')))
		.orderBy(asc(jobEvents.createdAt))
		.limit(100)

	let dispatched = 0
	for (const row of events) {
		const parsed = jobStatusChangedEventSchema.safeParse({
			...(row.payload as Record<string, unknown>),
			id: row.id,
			jobId: row.jobId,
			timestamp: row.createdAt.toISOString(),
		})

		if (!parsed.success) {
			await db
				.update(jobEvents)
				.set({
					processed: true,
					processedAt: new Date(),
					payload: {
						...(row.payload as Record<string, unknown>),
						dispatchError: 'invalid_payload',
					},
				})
				.where(eq(jobEvents.id, row.id))
			continue
		}

		const event = new NotificationEvent({
			id: row.id,
			userId: parsed.data.userId,
			payload: parsed.data,
			createdAt: row.createdAt,
		})

		sseBroker.publish(event.userId, 'message', event)

		await db
			.update(jobEvents)
			.set({
				processed: true,
				processedAt: new Date(),
			})
			.where(eq(jobEvents.id, row.id))

		dispatched += 1
	}

	return dispatched
}

export function initializeOutboxDispatcher(): void {
	if (timer) {
		return
	}

	timer = setInterval(() => {
		dispatchOutboxEvents()
			.then((count) => {
				if (count > 0) {
					logger.info({ count }, 'Dispatched outbox events to SSE broker')
				}
				sseBroker.sweepExpiredConnections()
			})
			.catch((error) => {
				logger.error(
					{ error: error instanceof Error ? error.message : String(error) },
					'Failed to dispatch outbox events',
				)
			})
	}, DISPATCH_INTERVAL_MS)

	logger.info('Notification outbox dispatcher initialized')
}

export async function closeOutboxDispatcher(): Promise<void> {
	if (!timer) {
		return
	}
	clearInterval(timer)
	timer = null
	logger.info('Notification outbox dispatcher closed')
}
