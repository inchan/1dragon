import { randomUUID } from 'node:crypto'
import { db } from '@/infrastructure/persistence/db.js'
import { jobEvents } from '@/infrastructure/persistence/schema.js'

export async function appendJobStatusEvent(input: {
	jobId: string
	userId: string
	previousStatus: string
	newStatus: string
	metadata?: Record<string, unknown>
	retryCount?: number
	errorMessage?: string | null
}): Promise<void> {
	await db.insert(jobEvents).values({
		jobId: input.jobId,
		eventType: 'JOB_STATUS_CHANGED',
		payload: {
			id: randomUUID(),
			jobId: input.jobId,
			userId: input.userId,
			previousStatus: input.previousStatus,
			newStatus: input.newStatus,
			timestamp: new Date().toISOString(),
			metadata: input.metadata ?? {},
			...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
			...(input.retryCount !== undefined ? { retryCount: input.retryCount } : {}),
		},
	})
}
