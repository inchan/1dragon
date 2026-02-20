import { randomUUID } from 'node:crypto'
import { PlanTier } from '@snapvid/shared'
import { Worker, type Job } from 'bullmq'
import { eq } from 'drizzle-orm'
import { NotificationEvent } from '@/domain/notification/entities.js'
import { config } from '@/shared/config.js'
import { db } from '@/infrastructure/persistence/db.js'
import { videoJobs } from '@/infrastructure/persistence/schema.js'
import { GenerateVideoUseCase } from '@/application/media/generate-video.usecase.js'
import { QualityControlService } from '@/application/media/quality-control.js'
import { createChildLogger } from '@/infrastructure/logging/logger.js'
import { FFmpegComposer } from '@/infrastructure/media/ffmpeg-composer.js'
import { PromptBuilder } from '@/infrastructure/media/prompt-builder.js'
import { sseBroker } from '@/infrastructure/notification/sse-broker.js'
import { appendJobStatusEvent } from '@/infrastructure/persistence/job-event.helper.js'
import { RemoveBgAdapter } from '@/infrastructure/providers/remove-bg/remove-bg.adapter.js'
import {
	GeminiVeoI2VAdapter,
	HailuoI2VAdapter,
	MiniMaxI2VAdapter,
	ProviderRouter,
	RunwayI2VAdapter,
} from '@/infrastructure/providers/i2v'
import {
	QueueName,
	redisConnection,
	type MediaGenerateJobData,
} from '../bullmq.config.js'
import { VideoJobRepositoryImpl, VideoVariantRepositoryImpl } from '@/infrastructure/persistence/repositories/video-job.repository.js'
import type { JobStatus } from '@/domain/media/value-objects.js'

const logger = createChildLogger({ provider: QueueName.MEDIA_GENERATE })

const MAX_RETRY_COUNT = 2
const JOB_PROGRESS_BY_STATUS: Record<JobStatus, number> = {
	QUEUED: 5,
	ANALYZING: 10,
	GENERATING: 35,
	COMPOSING: 60,
	RENDERING_VARIANTS: 85,
	SUCCEEDED: 100,
	FAILED: 100,
	DEGRADED_FAILED: 100,
}

const DEFAULT_COPY = {
	hook: '상품을 돋보이게 보여주는 영상',
	description: '핵심 장점을 강조하는 장면 구성',
	cta: '지금 확인해 보세요',
} as const

function resolvePlanTier(input: { duration: number; planTier?: PlanTier }): PlanTier {
	if (input.planTier === PlanTier.STARTER || input.planTier === PlanTier.FREE) {
		return input.planTier
	}

	return input.duration > 15 ? PlanTier.STARTER : PlanTier.FREE
}

function normalizeProgress(status: string): number {
	return Math.max(0, Math.min(100, JOB_PROGRESS_BY_STATUS[status as JobStatus] ?? 0))
}

function buildRetryCount(value: number | undefined): number {
	return Math.max(0, Math.min(MAX_RETRY_COUNT, Math.round(value ?? 0)))
}

function canRetryByPolicy(status: string, retryCount: number): boolean {
	return (status === 'FAILED' || status === 'DEGRADED_FAILED') && retryCount < MAX_RETRY_COUNT
}

async function persistJobTransition(
	repository: VideoJobRepositoryImpl,
	input: {
		jobId: string
		userId: string
		previousStatus: string
		newStatus: string
		errorMessage?: string | null
		retryCount?: number
		metadata?: Record<string, unknown>
	},
): Promise<void> {
	const normalizedStatus = input.newStatus as JobStatus
	const progress = normalizeProgress(normalizedStatus)
	const retryCount =
		input.retryCount !== undefined ? buildRetryCount(input.retryCount) : undefined
	const startedAt =
		normalizedStatus === 'ANALYZING' && input.previousStatus === 'QUEUED'
			? new Date()
			: undefined
	const completedAt = ['SUCCEEDED', 'FAILED', 'DEGRADED_FAILED'].includes(normalizedStatus)
		? new Date()
		: undefined

	const updates = {
		jobId: input.jobId,
		status: normalizedStatus,
		progress,
		...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
		...(retryCount !== undefined ? { retryCount } : {}),
		...(startedAt !== undefined ? { startedAt } : {}),
		...(completedAt !== undefined ? { completedAt } : {}),
	}

	await repository.updateStatus(updates)
	await appendJobStatusEvent({
		jobId: input.jobId,
		userId: input.userId,
		previousStatus: input.previousStatus,
		newStatus: normalizedStatus,
		metadata: {
			...(input.metadata ?? {}),
			reason: normalizedStatus === 'SUCCEEDED' ? 'pipeline_complete' : 'pipeline_progress',
			progress,
			...(retryCount !== undefined ? { retryCount } : {}),
		},
		...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
		...(retryCount !== undefined ? { retryCount } : {}),
	})

	// Publish SSE event for real-time client updates
	const event = new NotificationEvent({
		id: randomUUID(),
		userId: input.userId,
		payload: {
			id: randomUUID(),
			jobId: input.jobId,
			userId: input.userId,
			previousStatus: input.previousStatus,
			newStatus: normalizedStatus,
			timestamp: new Date().toISOString(),
			metadata: {
				...(input.metadata ?? {}),
				progress,
				...(retryCount !== undefined ? { retryCount } : {}),
			},
		},
	})
	sseBroker.publish(input.userId, 'JOB_STATUS_CHANGED', event)
}

export async function processMediaGenerateJob(job: Job<MediaGenerateJobData>): Promise<Record<string, unknown>> {
	const repository = new VideoJobRepositoryImpl()
	const router = new ProviderRouter({
		RUNWAY: new RunwayI2VAdapter({
			...(config.RUNWAY_API_KEY ? { apiKey: config.RUNWAY_API_KEY } : {}),
		}),
		HAILUO: new HailuoI2VAdapter({
			...(config.HAILUO_API_KEY ? { apiKey: config.HAILUO_API_KEY } : {}),
		}),
		GEMINI_VEO: new GeminiVeoI2VAdapter({
			...(config.GEMINI_VEO_API_KEY ? { apiKey: config.GEMINI_VEO_API_KEY } : {}),
		}),
		MINIMAX: new MiniMaxI2VAdapter({
			...(config.MINIMAX_API_KEY ? { apiKey: config.MINIMAX_API_KEY } : {}),
		}),
	})
	const useCase = new GenerateVideoUseCase(
		new PromptBuilder(),
		router,
		new FFmpegComposer(),
		new RemoveBgAdapter(),
		new QualityControlService(),
	)

	const jobId = job.data.projectId
	const userId = job.data.userId
	logger.info({ jobId, userId }, 'media generate job started')

	const existing = await repository.findById(jobId, userId)
	if (!existing) {
		throw new Error(`Video job not found: ${jobId}`)
	}

	const planTier = resolvePlanTier({
		duration: job.data.options.duration,
		...(job.data.options.planTier !== undefined ? { planTier: job.data.options.planTier } : {}),
	})
	const isFirstVideo = job.data.options.isFirstVideo === true

	const currentStatus = existing.status as JobStatus
	const currentRetryCount = buildRetryCount(existing.retryCount)

	try {
		const generated = await useCase.execute({
			jobId,
			userId,
			planTier,
			isFirstVideo,
			inputImageUrl: job.data.imageUrl,
			stylePreset: job.data.options.stylePreset ?? 'SIMPLE',
			productCategory: job.data.productCategory ?? 'OTHER',
			moods: job.data.moods ?? ['PROFESSIONAL'],
			keywords: job.data.keywords ?? [],
			copy: job.data.copy ?? DEFAULT_COPY,
			includeWatermark: planTier === PlanTier.FREE,
			currentStatus,
			currentRetryCount,
		})

		for (const transition of generated.events) {
			await persistJobTransition(repository, {
				jobId,
				userId,
				previousStatus: transition.previousStatus,
				newStatus: transition.newStatus,
				retryCount: generated.job.retryCount,
				metadata: {
					...transition.metadata,
					stage: 'generate-worker',
				},
				errorMessage: null,
			})
		}

		if (generated.status === 'SUCCEEDED' && generated.job.result) {
			const variantRepository = new VideoVariantRepositoryImpl()
			for (const variant of generated.job.result.variants) {
				await variantRepository.create({
					jobId,
					platform: variant.platform,
					resolution: `${variant.asset.width}x${variant.asset.height}`,
					duration: variant.asset.durationSec,
					fileUrl: variant.asset.url,
					thumbnailUrl: null,
					hasWatermark: variant.hasWatermark,
				})
			}
		}

		await db
			.update(videoJobs)
			.set({
				status: generated.status,
				retryCount: generated.job.retryCount,
				progress: normalizeProgress(generated.status),
				completedAt: generated.status === 'SUCCEEDED' ? new Date() : null,
				updatedAt: new Date(),
				errorMessage:
					generated.status === 'FAILED' || generated.status === 'DEGRADED_FAILED' ? 'quality evaluation failed' : null,
			})
			.where(eq(videoJobs.id, jobId))

		return {
			jobId: generated.job.id,
			status: generated.status,
			qualityScore: generated.qualityScore,
			shouldRetry: generated.shouldRetry,
			eventCount: generated.events.length,
		}
	} catch (error) {
		const nextRetryCount = buildRetryCount(currentRetryCount + 1)
		const queueHasMoreAttempts = (job.opts.attempts ?? 1) > job.attemptsMade + 1
		const shouldRetry = queueHasMoreAttempts && canRetryByPolicy(existing.status, nextRetryCount)

		const finalStatus = shouldRetry ? 'DEGRADED_FAILED' : 'FAILED'
		const errorMessage = error instanceof Error ? error.message : '영상 생성 처리 중 오류가 발생했습니다.'

		await persistJobTransition(repository, {
			jobId,
			userId,
			previousStatus: existing.status,
			newStatus: finalStatus,
			retryCount: nextRetryCount,
			errorMessage,
			metadata: {
				reason: 'worker_exception',
				canRetry: shouldRetry,
			},
		})

		if (shouldRetry) {
			throw error
		}

		return {
			jobId,
			status: finalStatus,
			qualityScore: 0,
			shouldRetry: false,
			eventCount: 0,
		}
	}
}

export function createMediaGenerateWorker(): Worker<MediaGenerateJobData> {
	return new Worker(
		QueueName.MEDIA_GENERATE,
		async (job) => processMediaGenerateJob(job),
		{ connection: redisConnection },
	)
}
