import { and, count, desc, eq } from 'drizzle-orm'
import { createHash, randomUUID } from 'node:crypto'
import { generateOAuthState, saveOAuthState, verifyOAuthState } from './oauth-state.js'
import { Hono } from 'hono'
import { z } from 'zod'
import { ErrorCode, PlanTier, productCategorySchema } from '@snapvid/shared'
import { createVideoJobRequestSchema } from '@snapvid/shared'
import { requireAuth } from '@/infrastructure/auth/hono-handler.js'
import { logger } from '@/infrastructure/logging/index.js'
import { sseBroker } from '@/infrastructure/notification/sse-broker.js'
import { db } from '@/infrastructure/persistence/db.js'
import { jobEvents, subscriptions, videoJobs } from '@/infrastructure/persistence/schema.js'
import { appendJobStatusEvent } from '@/infrastructure/persistence/job-event.helper.js'
import {
	QueueName,
	addJob,
	type MediaGenerateJobData,
} from '@/infrastructure/queue/bullmq.config.js'
import { VideoJobRepositoryImpl, VideoVariantRepositoryImpl } from '@/infrastructure/persistence/repositories/video-job.repository.js'
import { redisConnection } from '@/infrastructure/queue/bullmq.config.js'
import { RedisSocialTokenRepository } from '@/infrastructure/social/redis-social-token.repository.js'
import { MetaGraphAdapter, TikTokBusinessAdapter } from '@/infrastructure/providers/social/index.js'
import { config } from '@/shared/config.js'
import { GeminiModelCompositeAdapter } from '@/infrastructure/providers/image-gen/gemini-model-composite.adapter.js'
import { GenerateModelImageUseCase } from '@/application/model-persona/generate-model-image.usecase.js'
import { ModelPersonaSelectionRepositoryImpl } from '@/infrastructure/persistence/repositories/model-persona-selection.repository.js'

const MAX_RETRY_COUNT = 2
const CREATE_JOB_DEFAULT_DURATION = 15
const JOB_POLL_RETRY_INTERVAL_MS = 5_000

type NotificationEventPayload = {
	readonly id?: string
	readonly jobId: string
	readonly previousStatus: string
	readonly newStatus: string
	readonly timestamp: string
	readonly metadata?: Record<string, unknown>
	readonly errorMessage?: string | null
	readonly retryCount?: number
}

type LegacyStreamEvent = {
	type: 'JOB_STATUS_CHANGED'
	payload: NotificationEventPayload
}

type JobStatusEvent = {
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

type JobDetailResponse = {
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

function parseResolution(value: string): { width: number; height: number } {
	const parts = value.split('x')
	const width = Number(parts[0]) || 0
	const height = Number(parts[1]) || 0
	return { width, height }
}

const createJobRequestSchema = createVideoJobRequestSchema.extend({
	stage: z.string().trim().optional(),
	token: z.string().trim().optional(),
})

const UNAUTHORIZED_RESPONSE = {
	success: false,
	error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
} as const

function mapFieldErrors(
	errors: ReadonlyArray<{ path: ReadonlyArray<string | number>; message: string }>,
) {
	return errors.map((error) => ({
		field: error.path.join('.'),
		message: error.message,
	}))
}

function jobCanRetry(status: string, retryCount: number): boolean {
	return (status === 'FAILED' || status === 'DEGRADED_FAILED') && retryCount < MAX_RETRY_COUNT
}

function toIso(date: Date | null | undefined): string | null {
	return date ? date.toISOString() : null
}

function buildDeterministicJobId(userId: string, key: string, imageUrl: string): string {
	const hash = createHash('sha256')
		.update(`${userId}:${imageUrl}:${key}`)
		.digest('hex')
	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(
		20,
		32,
	)}`
}

function toRecord(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function toJobStatusEvent(
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

function normalizeStreamPayload(rawData: string): JobStatusEvent | null {
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

function toJobStatusEventFromDbPayload(
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

function extractJobIdFromStreamMessage(rawData: string): string | null {
	const parsed = normalizeStreamPayload(rawData)
	return parsed?.payload.jobId ?? null
}

function toJobStatusResponse(
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

function toJobStreamResponse(
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

function createJobEventStream(userId: string, jobId: string | null, lastEventId: string | null): ReadableStream<Uint8Array> {
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

export function createMediaRouter(): Hono {
	const app = new Hono()
	const tiktokAdapter = new TikTokBusinessAdapter({
		...(config.TIKTOK_CLIENT_KEY ? { clientKey: config.TIKTOK_CLIENT_KEY } : {}),
		...(config.TIKTOK_CLIENT_SECRET ? { clientSecret: config.TIKTOK_CLIENT_SECRET } : {}),
	})
	const metaAdapter = new MetaGraphAdapter({
		...(config.META_APP_ID ? { appId: config.META_APP_ID } : {}),
		...(config.META_APP_SECRET ? { appSecret: config.META_APP_SECRET } : {}),
	})
	const socialTokenRepository = new RedisSocialTokenRepository(redisConnection)
	const jobRepository = new VideoJobRepositoryImpl()
	const variantRepository = new VideoVariantRepositoryImpl()

	// C-2: 어댑터와 유스케이스를 라우터 생성 시 한 번만 인스턴스화
	const imagenApiKey = process.env.GEMINI_IMAGEN_API_KEY ?? process.env.GEMINI_VEO_API_KEY
	const compositeAdapter = new GeminiModelCompositeAdapter({
		...(imagenApiKey ? { apiKey: imagenApiKey } : {}),
	})
	const selectionRepository = new ModelPersonaSelectionRepositoryImpl()
	const generateModelImageUseCase = new GenerateModelImageUseCase(compositeAdapter, selectionRepository)

	app.use('*', requireAuth)

	const sharePayloadSchema = z.object({
		variantUrl: z.string().url(),
		caption: z.string().min(1),
		hashtags: z.array(z.string()).default([]),
	})

	const connectPayloadSchema = z.object({
		code: z.string().min(1),
		state: z.string().min(1),
	})

	const shareWithRetry = async <T extends { remoteId: string; shareUrl: string }>(
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
	> => {
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

	const parseJsonBody = async (
		c: { req: { json: () => Promise<unknown> } },
		userId: string,
		route: string,
	): Promise<unknown | null> => {
		try {
			return await c.req.json()
		} catch (error) {
			logger.warn({ userId, route, error }, 'Failed to parse JSON body')
			return null
		}
	}

	app.get('/jobs/stream', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const lastEventId = c.req.header('Last-Event-ID') ?? null
		const stream = createJobEventStream(user.id, null, lastEventId)
		return new Response(stream, {
			status: 200,
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no',
			},
		})
	})

	app.get('/jobs/:jobId/stream', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const jobId = c.req.param('jobId')
		const job = await jobRepository.findById(jobId, user.id)
		if (!job) {
			return c.json(
				{
					success: false,
					error: {
						code: 'JOB_NOT_FOUND',
						message: 'Job not found',
					},
				},
				404,
			)
		}

		const lastEventId = c.req.header('Last-Event-ID') ?? null
		const stream = createJobEventStream(user.id, job.id, lastEventId)
		return new Response(stream, {
			status: 200,
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no',
			},
		})
	})

	app.post('/jobs', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const body = await parseJsonBody(c, user.id, 'POST /api/v1/media/jobs')
		const parsed = createJobRequestSchema.safeParse(body)
		if (!parsed.success) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Validation failed',
						details: { fieldErrors: mapFieldErrors(parsed.error.errors) },
					},
				},
				400,
			)
		}

		const idempotencyKey =
			c.req.header('Idempotency-Key')?.trim() ??
			(parsed.data.idempotencyKey?.trim() ? parsed.data.idempotencyKey : undefined)

		const jobId = idempotencyKey
			? buildDeterministicJobId(user.id, idempotencyKey, parsed.data.imageUrl)
			: randomUUID()

		let existing = await jobRepository.findById(jobId, user.id)
		if (existing) {
			return c.json(
				{
					success: true,
					data: {
						...toJobStatusResponse(existing),
						isDuplicate: true,
					},
				},
				200,
			)
		}

		const [videoCountRow] = await db
			.select({
				totalJobs: count(),
			})
			.from(videoJobs)
			.where(eq(videoJobs.userId, user.id))
		const existingVideoCountRaw = videoCountRow?.totalJobs ?? 0
		const existingVideoCount =
			typeof existingVideoCountRaw === 'number'
				? existingVideoCountRaw
				: Number(existingVideoCountRaw)
		const isFirstVideo = existingVideoCount === 0

		const currentSubscription = await db.query.subscriptions.findFirst({
			where: eq(subscriptions.userId, user.id),
			with: { plan: true },
			orderBy: [desc(subscriptions.createdAt)],
		})
		const planTier =
			currentSubscription?.plan?.tier === PlanTier.STARTER
				? PlanTier.STARTER
				: PlanTier.FREE

		let created:
			| Awaited<ReturnType<(typeof jobRepository)['create']>>
			| null = null
		try {
			created = await jobRepository.create({
				id: jobId,
				userId: user.id,
				inputImageUrl: parsed.data.imageUrl,
				status: 'QUEUED',
			})
		} catch (error) {
			existing = await jobRepository.findById(jobId, user.id)
			if (existing) {
				return c.json(
					{
						success: true,
						data: {
							...toJobStatusResponse(existing),
							isDuplicate: true,
						},
					},
					200,
				)
			}
			throw error
		}

		const queuePayload: MediaGenerateJobData = {
			projectId: created.id,
			userId: user.id,
			imageUrl: parsed.data.imageUrl,
			...(idempotencyKey != null ? { idempotencyKey } : {}),
			retryAttempt: 0,
			...(parsed.data.productCategory != null ? { productCategory: parsed.data.productCategory } : {}),
			...(parsed.data.moods != null ? { moods: parsed.data.moods } : {}),
			...(parsed.data.keywords != null ? { keywords: parsed.data.keywords } : {}),
			...(parsed.data.copy != null ? { copy: parsed.data.copy } : {}),
			options: {
				duration: parsed.data.duration ?? CREATE_JOB_DEFAULT_DURATION,
				stylePreset: parsed.data.stylePreset,
				planTier,
				isFirstVideo,
			},
		}

		try {
			await addJob(QueueName.MEDIA_GENERATE, queuePayload, { jobId: created.id })
			await jobRepository.updateStatus({ jobId: created.id, status: 'QUEUED', progress: 0 })
			await appendJobStatusEvent({
				jobId: created.id,
				userId: user.id,
				previousStatus: created.status,
				newStatus: 'QUEUED',
				metadata: {
					source: 'queue',
					idempotencyKey,
					retryAttempt: 0,
				},
				retryCount: created.retryCount ?? 0,
			})
		} catch (error) {
			await jobRepository.updateStatus({
				jobId: created.id,
				status: 'FAILED',
				errorMessage: error instanceof Error ? error.message : '큐 등록 실패',
				progress: 100,
			})
			await appendJobStatusEvent({
				jobId: created.id,
				userId: user.id,
				previousStatus: 'QUEUED',
				newStatus: 'FAILED',
				metadata: {
					source: 'enqueue',
					reason: error instanceof Error ? error.message : 'enqueue_failed',
				},
				errorMessage: error instanceof Error ? error.message : 'enqueue_failed',
			}).catch(() => {
				// best effort
			})
			return c.json(
				{
					success: false,
					error: {
						code: 'PROVIDER_ERROR',
						message: 'Failed to enqueue generation job',
					},
				},
				503,
			)
		}

		return c.json(
			{
				success: true,
				data: toJobStatusResponse(created),
			},
			201,
		)
	})

	app.get('/jobs/:jobId', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const jobId = c.req.param('jobId')
		const job = await jobRepository.findById(jobId, user.id)
		if (!job) {
			return c.json(
				{
					success: false,
					error: {
						code: 'JOB_NOT_FOUND',
						message: 'Job not found',
					},
				},
				404,
			)
		}

		const rows = await db
			.select()
			.from(jobEvents)
			.where(and(eq(jobEvents.jobId, job.id), eq(jobEvents.eventType, 'JOB_STATUS_CHANGED')))
			.orderBy(desc(jobEvents.createdAt))
			.limit(20)

		const events = rows.map<JobStatusEvent>((row) => {
			const payload = toRecord(row.payload)
			const event = toJobStatusEventFromDbPayload(payload, {
				id: job.id,
				status: job.status,
				progress: job.progress,
				retryCount: job.retryCount,
				errorMessage: job.errorMessage,
			})
			return {
				...event,
				createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date(row.createdAt).toISOString(),
				payload: {
					...event.payload,
					canRetry: jobCanRetry(event.payload.newStatus, event.payload.retryCount ?? 0),
				},
			}
		})

		const variantRows = await variantRepository.findByJobId(job.id)
		const variants = variantRows.map((record) => ({
			id: record.id,
			jobId: record.jobId,
			platform: record.platform,
			videoUrl: record.fileUrl ?? '',
			thumbnailUrl: record.thumbnailUrl ?? '',
			duration: record.duration,
			resolution: parseResolution(record.resolution),
			fileSize: record.fileSize ?? 0,
			hasWatermark: record.hasWatermark,
		}))

		return c.json({
			success: true,
			data: {
				job: toJobStatusResponse(job),
				events,
				variants,
			},
		})
	})

	app.get('/shares/tiktok/connect-url', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const { state } = generateOAuthState(user.id)
		await saveOAuthState(redisConnection, state)
		return c.json({
			success: true,
			data: {
				url: tiktokAdapter.getAuthorizationUrl({
					redirectUri: 'https://snapvid.ai/oauth/tiktok/callback',
					state,
				}),
			},
		})
	})

	app.get('/shares/instagram/connect-url', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const { state } = generateOAuthState(user.id)
		await saveOAuthState(redisConnection, state)
		return c.json({
			success: true,
			data: {
				url: metaAdapter.getAuthorizationUrl({
					redirectUri: 'https://snapvid.ai/oauth/instagram/callback',
					state,
				}),
			},
		})
	})

	app.post('/shares/tiktok/connect', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const body = await parseJsonBody(c, user.id, 'POST /api/v1/media/shares/tiktok/connect')
		const parsed = connectPayloadSchema.safeParse(body)
		if (!parsed.success) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Validation failed',
						details: { fieldErrors: mapFieldErrors(parsed.error.errors) },
					},
				},
				400,
			)
		}

		const tiktokStateResult = await verifyOAuthState(redisConnection, parsed.data.state, user.id)
		if (!tiktokStateResult.valid) {
			logger.warn({ reason: tiktokStateResult.reason, userId: user.id }, 'TikTok OAuth state verification failed')
			return c.json(
				{
					success: false,
					error: { code: 'INVALID_STATE', message: 'Invalid or expired OAuth state' },
				},
				400,
			)
		}

		const token = await tiktokAdapter.exchangeCodeForToken(parsed.data.code)
		await socialTokenRepository.set('tiktok', user.id, token.accessToken)

		return c.json({
			success: true,
			data: {
				platform: 'TIKTOK',
				connected: true,
				expiresInSec: token.expiresInSec,
			},
		})
	})

	app.post('/shares/instagram/connect', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const body = await parseJsonBody(c, user.id, 'POST /api/v1/media/shares/instagram/connect')
		const parsed = connectPayloadSchema.safeParse(body)
		if (!parsed.success) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Validation failed',
						details: { fieldErrors: mapFieldErrors(parsed.error.errors) },
					},
				},
				400,
			)
		}

		const instagramStateResult = await verifyOAuthState(redisConnection, parsed.data.state, user.id)
		if (!instagramStateResult.valid) {
			logger.warn({ reason: instagramStateResult.reason, userId: user.id }, 'Instagram OAuth state verification failed')
			return c.json(
				{
					success: false,
					error: { code: 'INVALID_STATE', message: 'Invalid or expired OAuth state' },
				},
				400,
			)
		}

		const token = await metaAdapter.exchangeCodeForToken(parsed.data.code)
		await socialTokenRepository.set('instagram', user.id, token.accessToken)

		return c.json({
			success: true,
			data: {
				platform: 'INSTAGRAM',
				connected: true,
				expiresInSec: token.expiresInSec,
			},
		})
	})

	app.post('/shares/tiktok', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const body = await parseJsonBody(c, user.id, 'POST /api/v1/media/shares/tiktok')
		const parsed = sharePayloadSchema.safeParse(body)
		if (!parsed.success) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Validation failed',
						details: { fieldErrors: mapFieldErrors(parsed.error.errors) },
					},
				},
				400,
			)
		}

		const token = await socialTokenRepository.get('tiktok', user.id)
		if (!token) {
			return c.json(
				{
					success: false,
					error: {
						code: 'ACCOUNT_NOT_CONNECTED',
						message: 'TikTok account is not connected',
					},
				},
				400,
			)
		}

		const shared = await shareWithRetry(
			() =>
				tiktokAdapter.uploadVideo({
					accessToken: token,
					videoUrl: parsed.data.variantUrl,
					caption: parsed.data.caption,
					hashtags: parsed.data.hashtags,
				}),
			{ platform: 'TIKTOK', userId: user.id },
		)

		if (!shared.success) {
			return c.json({
				success: false,
				error: {
					code: 'SOCIAL_UPLOAD_FAILED',
					message: '업로드에 실패했습니다. 다운로드 후 직접 업로드해주세요',
				},
				data: {
					platform: 'TIKTOK',
					fallbackDownloadUrl: parsed.data.variantUrl,
				},
			})
		}

		return c.json({
			success: true,
			data: {
				platform: 'TIKTOK',
				attempts: shared.attempts,
				remoteId: shared.output.remoteId,
				shareUrl: shared.output.shareUrl,
			},
		})
	})

	app.post('/shares/instagram', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const body = await parseJsonBody(c, user.id, 'POST /api/v1/media/shares/instagram')
		const parsed = sharePayloadSchema.safeParse(body)
		if (!parsed.success) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Validation failed',
						details: { fieldErrors: mapFieldErrors(parsed.error.errors) },
					},
				},
				400,
			)
		}

		const token = await socialTokenRepository.get('instagram', user.id)
		if (!token) {
			return c.json(
				{
					success: false,
					error: {
						code: 'ACCOUNT_NOT_CONNECTED',
						message: 'Instagram account is not connected',
					},
				},
				400,
			)
		}

		const shared = await shareWithRetry(
			() =>
				metaAdapter.uploadVideo({
					accessToken: token,
					videoUrl: parsed.data.variantUrl,
					caption: parsed.data.caption,
					hashtags: parsed.data.hashtags,
				}),
			{ platform: 'INSTAGRAM', userId: user.id },
		)

		if (!shared.success) {
			return c.json({
				success: false,
				error: {
					code: 'SOCIAL_UPLOAD_FAILED',
					message: '업로드에 실패했습니다. 다운로드 후 직접 업로드해주세요',
				},
				data: {
					platform: 'INSTAGRAM',
					fallbackDownloadUrl: parsed.data.variantUrl,
				},
			})
		}

		return c.json({
			success: true,
			data: {
				platform: 'INSTAGRAM',
				attempts: shared.attempts,
				remoteId: shared.output.remoteId,
				shareUrl: shared.output.shareUrl,
			},
		})
	})

	function buildDefaultImagenPromptTemplate(persona: {
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

	const modelCompositeBodySchema = z.object({
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

	app.post('/model-composite', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const body = await parseJsonBody(c, user.id, 'POST /api/v1/media/model-composite')
		const parsed = modelCompositeBodySchema.safeParse(body)
		if (!parsed.success) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Validation failed',
						details: { fieldErrors: mapFieldErrors(parsed.error.errors) },
					},
				},
				400,
			)
		}

		try {
			const result = await generateModelImageUseCase.execute({
				userId: user.id,
				productImageUrl: parsed.data.productImageUrl,
				...(parsed.data.productName ? { productName: parsed.data.productName } : {}),
				productCategory: parsed.data.productCategory,
				productKeywords: parsed.data.productKeywords,
				preset: {
					id: parsed.data.persona.id,
					name: parsed.data.persona.id,
					gender: parsed.data.persona.gender,
					ageRange: parsed.data.persona.ageRange,
					bodyType: parsed.data.persona.bodyType,
					style: parsed.data.persona.style,
					imagenPromptTemplate:
					parsed.data.persona.imagenPromptTemplate?.trim() ||
					buildDefaultImagenPromptTemplate(parsed.data.persona),
					previewImageUrl: null,
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			})

			return c.json({
				success: true,
				data: {
					compositeImageUrl: result.generatedImageUrl,
					qualityScore: result.qualityScore,
					accepted: result.accepted,
					fallbackToProductOnly: result.fallbackToProductOnly,
					message: result.message,
				},
			})
		} catch (error) {
			logger.error({ userId: user.id, error }, 'model-composite generation failed')
			return c.json(
				{
					success: false,
					error: {
						code: 'PROVIDER_ERROR',
						message: '모델 합성 이미지 생성에 실패했습니다',
					},
				},
				503,
			)
		}
	})

	return app
}
