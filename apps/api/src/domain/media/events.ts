import { JOB_STATUSES, type JobStatus } from './value-objects.js'

export type JobStatusChangedEvent = {
	readonly id: string
	readonly jobId: string
	readonly userId: string
	readonly previousStatus: JobStatus
	readonly newStatus: JobStatus
	readonly timestamp: Date
	readonly metadata: Record<string, unknown>
}

const ALLOWED_TRANSITIONS: Readonly<Record<JobStatus, readonly JobStatus[]>> = {
	QUEUED: [JOB_STATUSES.ANALYZING, JOB_STATUSES.FAILED, JOB_STATUSES.DEGRADED_FAILED],
	ANALYZING: [JOB_STATUSES.GENERATING, JOB_STATUSES.FAILED, JOB_STATUSES.DEGRADED_FAILED],
	GENERATING: [JOB_STATUSES.COMPOSING, JOB_STATUSES.FAILED, JOB_STATUSES.DEGRADED_FAILED],
	COMPOSING: [JOB_STATUSES.RENDERING_VARIANTS, JOB_STATUSES.FAILED, JOB_STATUSES.DEGRADED_FAILED],
	RENDERING_VARIANTS: [JOB_STATUSES.SUCCEEDED, JOB_STATUSES.FAILED, JOB_STATUSES.DEGRADED_FAILED],
	SUCCEEDED: [],
	FAILED: [JOB_STATUSES.QUEUED],
	DEGRADED_FAILED: [JOB_STATUSES.QUEUED],
}

export class InvalidJobStatusTransitionError extends Error {
	public constructor(from: JobStatus, to: JobStatus) {
		super(`Invalid state transition: ${from} → ${to}`)
		this.name = 'InvalidJobStatusTransitionError'
	}
}

export class VideoJobStateMachine {
	public static canTransition(from: JobStatus, to: JobStatus): boolean {
		return ALLOWED_TRANSITIONS[from].includes(to)
	}

	public static assertTransition(from: JobStatus, to: JobStatus): void {
		if (!this.canTransition(from, to)) {
			throw new InvalidJobStatusTransitionError(from, to)
		}
	}
}

export function createJobStatusChangedEvent(input: {
	readonly id: string
	readonly jobId: string
	readonly userId: string
	readonly previousStatus: JobStatus
	readonly newStatus: JobStatus
	readonly metadata?: Record<string, unknown>
	readonly timestamp?: Date
}): JobStatusChangedEvent {
	VideoJobStateMachine.assertTransition(input.previousStatus, input.newStatus)

	return {
		id: input.id,
		jobId: input.jobId,
		userId: input.userId,
		previousStatus: input.previousStatus,
		newStatus: input.newStatus,
		timestamp: input.timestamp ?? new Date(),
		metadata: input.metadata ?? {},
	}
}
