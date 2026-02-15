import { z } from 'zod'

export const jobStatusChangedEventSchema = z.object({
	id: z.string().uuid(),
	jobId: z.string().uuid(),
	userId: z.string().uuid(),
	previousStatus: z.string(),
	newStatus: z.string(),
	timestamp: z.string().datetime(),
	metadata: z.record(z.unknown()).default({}),
})

export type JobStatusChangedEvent = z.infer<typeof jobStatusChangedEventSchema>

export class NotificationEvent {
	public readonly id: string
	public readonly type: 'JOB_STATUS_CHANGED'
	public readonly userId: string
	public readonly payload: JobStatusChangedEvent
	public readonly createdAt: Date

	public constructor(input: {
		id: string
		userId: string
		payload: JobStatusChangedEvent
		createdAt?: Date
	}) {
		this.id = input.id
		this.type = 'JOB_STATUS_CHANGED'
		this.userId = input.userId
		this.payload = input.payload
		this.createdAt = input.createdAt ?? new Date()
	}
}
