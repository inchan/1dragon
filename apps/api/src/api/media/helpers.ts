import { createHash } from 'node:crypto'
import { z } from 'zod'
import { createVideoJobRequestSchema, productCategorySchema } from '@1dragon/shared'
import { logger } from '@/infrastructure/logging/index.js'
import { sseBroker } from '@/infrastructure/notification/sse-broker.js'

// ── Constants ──────────────────────────────────────────────────────────────────

export const MAX_RETRY_COUNT = 2
export const CREATE_JOB_DEFAULT_DURATION = 15
export const JOB_POLL_RETRY_INTERVAL_MS = 5_000

export const UNAUTHORIZED_RESPONSE = {
	success: false,
	error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
} as const

// ── Types ──────────────────────────────────────────────────────────────────────

export type NotificationEventPayload = {
	readonly id?: string
	readonly jobId: string
	readonly previousStatus: string
	readonly newStatus: string
	readonly timestamp: string
	readonly metadata?: Record<string, unknown>
	readonly errorMessage?: string | null
	readonly retryCount?: number
}

export type LegacyStreamEvent = {
	type: 'JOB_STATUS_CHANGED'
	payload: NotificationEventPayload
}

export type JobStatusEvent = {
	eventType: 'JOB_STATUS_CHANGED'
	payload: {
		jobId: string
		newStatus: string
		progress: number
		errorMessage?: string | null
		retryCount?: number
		canRetry?: boolean
		timestamp: string
		metadata?: Record<string, unknown>
	}
	createdAt: string
}

export type JobDetailResponse = {
	id: string
	jobId: string
	status: string
	progress: number
	retryCount: number
	errorMessage: string | null
	canRetry: boolean
	createdAt: string
	updatedAt: string
	startedAt: string | null
	completedAt: string | null
}

// ── Schemas ────────────────────────────────────────────────────────────────────

export const createJobRequestSchema = createVideoJobRequestSchema.extend({
	stage: z.string().trim().optional(),
	token: z.string().trim().optional(),
})

export const sharePayloadSchema = z.object({
	variantUrl: z.string().url(),
	caption: z.string().min(1),
	hashtags: z.array(z.string()).default([]),
})

export const connectPayloadSchema = z.object({
	code: z.string().min(1),
	state: z.string().min(1),
})

export const modelCompositeBodySchema = z.object({
	productImageUrl: z.string().url(),
	productName: z.string().optional(),
	productCategory: productCategorySchema,
	productKeywords: z.array(z.string()),
	persona: z.object({
		id: z.string().min(1),
		gender: z.enum(['FEMALE', 'MALE', 'NON_BINARY']),
		ageRange: z.enum(['YOUNG_ADULT', 'ADULT', 'MIDDLE_AGED', 'SENIOR']),
		bodyType: z.enum(['SLIM', 'REGULAR']),
		style: z.enum(['CASUAL', 'FORMAL', 'STREET', 'MINIMAL']),
		imagenPromptTemplate: z.string().optional(),
	}),
})

// ── Pure helper functions ──────────────────────────────────────────────────────

export function parseResolution(value: string): { width: number; height: number } {
	const parts = value.split('x')
	const width = Number(parts[0]) || 0
	const height = Number(parts[1]) || 0
	return { width, height }
}

export function mapFieldErrors(
	errors: ReadonlyArray<{ path: ReadonlyArray<string | number>; message: string }>,
): Array<{ field: string; message: string }> {
	return errors.map((error) => ({
		field: error.path.join('.'),
		message: error.message,
	}))
}

export function jobCanRetry(status: string, retryCount: number): boolean {
	return (status === 'FAILED' || status === 'DEGRADED_FAILED') && retryCount < MAX_RETRY_COUNT
}

export function toIso(date: Date | null | undefined): string | null {
	return date ? date.toISOString() : null
}

export function buildDeterministicJobId(userId: string, key: string, imageUrl: string): string {
	const hash = createHash('sha256')
		.update(`${userId}:${imageUrl}:${key}`)
		.digest('hex')
	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(
		20,
		32,
	)}`
}

export function toRecord(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

export function toJobStatusEvent(
	payloadCandidate: Record<string, unknown> | null,
	fallback: {
		jobId: string
		retryCount: number
		errorMessage: string | null
		progress: number
		timestamp: string
	},
): JobStatusEvent | null {
	if (!payloadCandidate) {
		return null
	}

	const previousStatus =
		typeof payloadCandidate.previousStatus === 'string' ? payloadCandidate.previousStatus : 'QUEUED'
	const newStatus =
		typeof payloadCandidate.newStatus === 'string' ? payloadCandidate.newStatus : 'QUEUED'
	const jobId = typeof payloadCandidate.jobId === 'string' ? payloadCandidate.jobId : fallback.jobId

	const metadataCandidate = toRecord(payloadCandidate.metadata)
	const progressValue =
		typeof metadataCandidate?.progress === 'number'
			? metadataCandidate.progress
			: typeof payloadCandidate.progress === 'number'
				? payloadCandidate.progress
				: undefined

	const progress = typeof progressValue === 'number' ? Math.max(0, Math.min(100, progressValue)) : fallback.progress
	const retryCount =
		typeof payloadCandidate.retryCount === 'number' ? Math.max(0, Math.round(payloadCandidate.retryCount)) : fallback.retryCount
	const timestamp =
		typeof payloadCandidate.timestamp === 'string'
			? payloadCandidate.timestamp
			: fallback.timestamp
	const errorMessage =
		payloadCandidate.errorMessage === null
			? null
			: typeof payloadCandidate.errorMessage === 'string'
				? payloadCandidate.errorMessage
				: fallback.errorMessage

	return {
		eventType: 'JOB_STATUS_CHANGED',
		payload: {
			jobId,
			newStatus,
			progress,
			errorMessage,
			retryCount,
			canRetry: jobCanRetry(newStatus, retryCount),
			timestamp,
			metadata: metadataCandidate ?? {},
		},
		createdAt: timestamp,
	}
}

export function normalizeStreamPayload(rawData: string): JobStatusEvent | null {
	let parsed: unknown = null
	try {
		parsed = JSON.parse(rawData)
	} catch {
		return null
	}

	const root = toRecord(parsed)
	if (!root) {
		return null
	}

	let payload: Record<string, unknown> | null = null

	if (root.type === 'JOB_STATUS_CHANGED') {
		payload = toRecord(root.payload)
		if (!payload) {
			return null
		}

		return toJobStatusEvent(payload, {
			jobId: 'unknown',
			retryCount: 0,
			errorMessage: null,
			progress: 0,
			timestamp: new Date().toISOString(),
		})
	}

	if (root.eventType === 'JOB_STATUS_CHANGED') {
		payload = toRecord(root.payload) ?? root
	}

	if (!payload) {
		return null
	}

	if (typeof payload.jobId !== 'string' || typeof payload.newStatus !== 'string' || typeof payload.timestamp !== 'string') {
		return null
	}

	if (typeof payload.previousStatus !== 'string') {
		return null
	}

	return toJobStatusEvent(payload, {
		jobId: payload.jobId,
		retryCount: 0,
		errorMessage: null,
		progress: 0,
		timestamp: payload.timestamp,
	})
}

export function toJobStatusEventFromDbPayload(
	rawPayload: Record<string, unknown> | null,
	job: { id: string; status: string; progress: number; retryCount: number | null; errorMessage: string | null },
): JobStatusEvent {
	const payload = rawPayload ?? {}
	const event = toJobStatusEvent(payload, {
		jobId: job.id,
		retryCount: job.retryCount ?? 0,
		errorMessage: job.errorMessage,
		progress: job.progress,
		timestamp: new Date().toISOString(),
	})

	if (event) {
		return event
	}

	return {
		eventType: 'JOB_STATUS_CHANGED',
		payload: {
			jobId: job.id,
			newStatus: job.status,
			progress: job.progress,
			errorMessage: job.errorMessage,
			retryCount: job.retryCount ?? 0,
			canRetry: jobCanRetry(job.status, job.retryCount ?? 0),
			timestamp: new Date().toISOString(),
		},
		createdAt: new Date().toISOString(),
	}
}

export function extractJobIdFromStreamMessage(rawData: string): string | null {
	const parsed = normalizeStreamPayload(rawData)
	return parsed?.payload.jobId ?? null
}

export function toJobStatusResponse(
	row: {
		id: string
		status: string
		progress: number
		retryCount: number | null
		errorMessage: string | null
		createdAt: Date
		updatedAt: Date
		startedAt: Date | null
		completedAt: Date | null
	},
): JobDetailResponse {
	const retryCount = row.retryCount ?? 0
	return {
		id: row.id,
		jobId: row.id,
		status: row.status,
		progress: row.progress,
		retryCount,
		errorMessage: row.errorMessage,
		canRetry: jobCanRetry(row.status, retryCount),
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		startedAt: toIso(row.startedAt),
		completedAt: toIso(row.completedAt),
	}
}

export function toJobStreamResponse(
	row: {
		id: string
		status: string
		progress: number
		retryCount: number | null
		errorMessage: string | null
	},
): JobStatusEvent {
	return {
		eventType: 'JOB_STATUS_CHANGED',
		payload: {
			jobId: row.id,
			newStatus: row.status,
			progress: row.progress,
			errorMessage: row.errorMessage,
			retryCount: row.retryCount ?? 0,
			canRetry: jobCanRetry(row.status, row.retryCount ?? 0),
			timestamp: new Date().toISOString(),
		},
		createdAt: new Date().toISOString(),
	}
}

// ── SSE stream factory ─────────────────────────────────────────────────────────

export function createJobEventStream(userId: string, jobId: string | null, lastEventId: string | null): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder()
	let heartbeat: NodeJS.Timeout | null = null
	let clientId: string | null = null

	return new ReadableStream<Uint8Array>({
		start: (controller) => {
			const send = (chunk: string): void => {
				controller.enqueue(encoder.encode(chunk))
			}
			const close = (): void => {
				if (heartbeat) {
					clearInterval(heartbeat)
					heartbeat = null
				}
				try {
					controller.close()
				} catch {
					// ignore
				}
			}

			clientId = sseBroker.connect(userId, send, close)

			const replayed = sseBroker.replay(userId, lastEventId)
			for (const message of replayed) {
				if (jobId && extractJobIdFromStreamMessage(message) !== jobId) {
					continue
				}
				send(message)
			}

			heartbeat = setInterval(() => {
				send(sseBroker.createHeartbeatEvent())
				sseBroker.sweepExpiredConnections()
			}, sseBroker.getHeartbeatIntervalMs())
		},
		cancel: () => {
			if (heartbeat) {
				clearInterval(heartbeat)
				heartbeat = null
			}
			if (clientId) {
				sseBroker.disconnect(clientId)
			}
		},
	})
}

// ── Retry wrapper for social share ─────────────────────────────────────────────

export async function shareWithRetry<T extends { remoteId: string; shareUrl: string }>(
	uploadFn: () => Promise<T>,
	context: {
		platform: string
		userId: string
	},
): Promise<
	| {
			success: true
			attempts: number
			output: T
	  }
	| { success: false; attempts: number }
> {
	for (let attempts = 1; attempts <= 2; attempts += 1) {
		try {
			const output = await uploadFn()
			return {
				success: true,
				attempts,
				output,
			}
		} catch (error) {
			logger.warn({ platform: context.platform, attempts, userId: context.userId, error }, 'Media share upload attempt failed')
			if (attempts === 2) {
				return { success: false, attempts }
			}
		}
	}

	return { success: false, attempts: 2 }
}

// ── JSON body parser ───────────────────────────────────────────────────────────

export async function parseJsonBody(
	c: { req: { json: () => Promise<unknown> } },
	userId: string,
	route: string,
): Promise<unknown | null> {
	try {
		return await c.req.json()
	} catch (error) {
		logger.warn({ userId, route, error }, 'Failed to parse JSON body')
		return null
	}
}

// ── Imagen prompt builder ──────────────────────────────────────────────────────

export function buildDefaultImagenPromptTemplate(persona: {
	gender: string
	ageRange: string
	bodyType: string
	style: string
}): string {
	const genderDesc = persona.gender === 'FEMALE' ? 'woman' : persona.gender === 'MALE' ? 'man' : 'person'
	const ageDesc =
		persona.ageRange === 'YOUNG_ADULT'
			? 'in their 20s'
			: persona.ageRange === 'ADULT'
				? 'in their 30s'
				: persona.ageRange === 'MIDDLE_AGED'
					? 'in their 40s'
					: 'in their 50s'
	const styleDesc = persona.style.toLowerCase()

	return [
		`A ${persona.bodyType.toLowerCase()} ${genderDesc} ${ageDesc} with ${styleDesc} style,`,
		`wearing/holding {{product_name}},`,
		`photorealistic portrait, natural lighting, 9:16 vertical format,`,
		`product clearly visible and recognizable, professional quality,`,
		`product: {{product_name}}, category: {{product_category}}, keywords: {{product_keywords}}`,
	].join(' ')
}
