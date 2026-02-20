import { randomUUID } from 'node:crypto'
import { and, count, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { ErrorCode, PlanTier } from '@snapvid/shared'
import { db } from '@/infrastructure/persistence/db.js'
import { jobEvents, subscriptions, videoJobs } from '@/infrastructure/persistence/schema.js'
import { appendJobStatusEvent } from '@/infrastructure/persistence/job-event.helper.js'
import {
	QueueName,
	addJob,
	type MediaGenerateJobData,
} from '@/infrastructure/queue/bullmq.config.js'
import type { VideoJobRepositoryImpl, VideoVariantRepositoryImpl } from '@/infrastructure/persistence/repositories/video-job.repository.js'
import { logger } from '@/infrastructure/logging/index.js'
import { config } from '@/shared/config.js'
import { safeErrorMessage } from '@/shared/error-utils.js'
import {
	CREATE_JOB_DEFAULT_DURATION,
	UNAUTHORIZED_RESPONSE,
	buildDeterministicJobId,
	createJobRequestSchema,
	jobCanRetry,
	mapFieldErrors,
	parseJsonBody,
	parseResolution,
	toJobStatusEventFromDbPayload,
	toJobStatusResponse,
	toRecord,
	type JobStatusEvent,
} from './helpers.js'

export function createJobSubRouter(deps: {
	jobRepository: VideoJobRepositoryImpl
	variantRepository: VideoVariantRepositoryImpl
}): Hono {
	const app = new Hono()
	const { jobRepository, variantRepository } = deps

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
			logger.error(
				{ error: error instanceof Error ? error.message : String(error), jobId: created.id },
				'Failed to enqueue generation job',
			)
			await jobRepository.updateStatus({
				jobId: created.id,
				status: 'FAILED',
				errorMessage: safeErrorMessage(error, config.NODE_ENV),
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

	return app
}
