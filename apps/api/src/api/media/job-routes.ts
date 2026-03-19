import { randomUUID } from 'node:crypto'
import { resolveLandingPageTruth } from '@/application/media/landing-page-truth.js'
import { buildOfficialReferenceQueryPlan } from '@/application/media/reference-query-plan.js'
import { normalizeReferenceBriefInput } from '@/application/media/reference-brief.js'
import { buildOfficialReferenceDiscoveryBundle } from '@/application/media/reference-source-discovery.js'
import { probeOfficialReferenceSources } from '@/application/media/reference-source-probe.js'
import {
	DailyPublishHealthService,
	MediaReliabilityPolicyService,
} from '@/domain/media/services.js'
import type { ProductAnalysisRepository } from '@/domain/product/ports.js'
import { logger } from '@/infrastructure/logging/index.js'
import { db } from '@/infrastructure/persistence/db.js'
import { appendJobStatusEvent } from '@/infrastructure/persistence/job-event.helper.js'
import { ProductAnalysisRepositoryImpl } from '@/infrastructure/persistence/repositories/product-analysis.repository.js'
import type {
	VideoJobRepositoryImpl,
	VideoVariantRepositoryImpl,
} from '@/infrastructure/persistence/repositories/video-job.repository.js'
import { jobEvents, subscriptions, videoJobs } from '@/infrastructure/persistence/schema.js'
import {
	type MediaGenerateJobData,
	QueueName,
	addJob,
} from '@/infrastructure/queue/bullmq.config.js'
import { config } from '@/shared/config.js'
import { safeErrorMessage } from '@/shared/error-utils.js'
import {
	ErrorCode,
	PlanTier,
	type ReferenceIntake,
	resolveAgenticExecutionPlan,
} from '@1dragon/shared'
import { and, count, desc, eq, gte } from 'drizzle-orm'
import { Hono } from 'hono'
import {
	CREATE_JOB_DEFAULT_DURATION,
	type JobStatusEvent,
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
} from './helpers.js'

export function createJobSubRouter(deps: {
	jobRepository: VideoJobRepositoryImpl
	variantRepository: VideoVariantRepositoryImpl
	productAnalysisRepository?: ProductAnalysisRepository
}): Hono {
	const app = new Hono()
	const { jobRepository, variantRepository } = deps
	const productAnalysisRepository =
		deps.productAnalysisRepository ?? new ProductAnalysisRepositoryImpl()
	const reliabilityPolicy = new MediaReliabilityPolicyService().getDailyPublishHealthPolicy()
	const dailyPublishHealthService = new DailyPublishHealthService(reliabilityPolicy)

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

		const productAnalysisId = parsed.data.productAnalysisId
		const productAnalysis = productAnalysisId
			? await productAnalysisRepository.findById(productAnalysisId, user.id)
			: null
		if (productAnalysisId && !productAnalysis) {
			return c.json(
				{
					success: false,
					error: {
						code: ErrorCode.VALIDATION,
						message: 'Validation failed',
						details: {
							fieldErrors: [
								{
									field: 'productAnalysisId',
									message: 'productAnalysisId must reference an analysis owned by the current user',
								},
							],
						},
					},
				},
				400,
			)
		}

		const idempotencyKey =
			c.req.header('Idempotency-Key')?.trim() ??
			(parsed.data.idempotencyKey?.trim() ? parsed.data.idempotencyKey : undefined)
		const agenticPlan = resolveAgenticExecutionPlan({
			...(parsed.data.agenticMode ? { agenticMode: parsed.data.agenticMode } : {}),
			...(parsed.data.productCategory ? { productCategory: parsed.data.productCategory } : {}),
			...(parsed.data.keywords ? { keywords: parsed.data.keywords } : {}),
			...(parsed.data.platforms ? { platforms: parsed.data.platforms } : {}),
			...(parsed.data.duration ? { duration: parsed.data.duration } : {}),
			...(parsed.data.personaId ? { personaId: parsed.data.personaId } : {}),
			...(parsed.data.creativeContext ? { creativeContext: parsed.data.creativeContext } : {}),
			...(parsed.data.autoShortformWorkflow !== undefined
				? { autoShortformWorkflow: parsed.data.autoShortformWorkflow }
				: {}),
			...(parsed.data.skipWearableComposite !== undefined
				? { skipWearableComposite: parsed.data.skipWearableComposite }
				: {}),
		})
		const normalizedReferenceBrief = parsed.data.referenceBrief
			? normalizeReferenceBriefInput({
					brief: parsed.data.referenceBrief,
					fallbackPlatforms: parsed.data.platforms,
					resolvedLandingPage: await resolveLandingPageTruth({
						...(parsed.data.referenceBrief.landingPageUrl
							? { landingPageUrl: parsed.data.referenceBrief.landingPageUrl }
							: {}),
						...(parsed.data.referenceBrief.landingPageText
							? { landingPageText: parsed.data.referenceBrief.landingPageText }
							: {}),
					}),
					...(productAnalysis
						? {
								productAnalysis: {
									id: productAnalysis.id,
									category: productAnalysis.category,
									keywords: [...productAnalysis.keywords],
									...(productAnalysis.targetAudience
										? { targetAudience: productAnalysis.targetAudience }
										: {}),
								},
							}
						: {}),
				})
			: undefined
		const referenceIntake: ReferenceIntake | undefined =
			parsed.data.referenceBrief && normalizedReferenceBrief
				? {
						referenceBrief: parsed.data.referenceBrief,
						normalizedReferenceBrief,
						taxonomy: normalizedReferenceBrief.taxonomy,
						...(productAnalysisId ? { productAnalysisId } : {}),
						...(productAnalysis
							? {
									productAnalysis: {
										id: productAnalysis.id,
										...(productAnalysis.category ? { category: productAnalysis.category } : {}),
										keywords: [...productAnalysis.keywords],
										...(productAnalysis.targetAudience
											? { targetAudience: productAnalysis.targetAudience }
											: {}),
									},
								}
							: {}),
					}
				: undefined

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
						agenticPlan,
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
			currentSubscription?.plan?.tier === PlanTier.STARTER ? PlanTier.STARTER : PlanTier.FREE

		let created: Awaited<ReturnType<(typeof jobRepository)['create']>> | null = null
		try {
			created = await jobRepository.create({
				id: jobId,
				userId: user.id,
				inputImageUrl: parsed.data.imageUrl,
				...(productAnalysisId ? { productAnalysisId } : {}),
				...(referenceIntake ? { referenceIntake } : {}),
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
							agenticPlan,
							isDuplicate: true,
						},
					},
					200,
				)
			}
			throw error
		}

		const queuePayload: MediaGenerateJobData = {
			...(parsed.data.creativeContext != null
				? {
						creativeContext: {
							...(parsed.data.creativeContext.location
								? { location: parsed.data.creativeContext.location }
								: {}),
							...(parsed.data.creativeContext.profession
								? { profession: parsed.data.creativeContext.profession }
								: {}),
							...(parsed.data.creativeContext.identity
								? { identity: parsed.data.creativeContext.identity }
								: {}),
							...(parsed.data.creativeContext.traits
								? { traits: parsed.data.creativeContext.traits }
								: {}),
							...(parsed.data.creativeContext.visualStyle
								? { visualStyle: parsed.data.creativeContext.visualStyle }
								: {}),
						},
					}
				: {}),
			projectId: created.id,
			userId: user.id,
			imageUrl: parsed.data.imageUrl,
			...(productAnalysisId ? { productAnalysisId } : {}),
			...(referenceIntake
				? {
						referenceBrief: referenceIntake.referenceBrief,
						normalizedReferenceBrief: referenceIntake.normalizedReferenceBrief,
					}
				: {}),
			...(parsed.data.personaId != null ? { personaId: parsed.data.personaId } : {}),
			...(idempotencyKey != null ? { idempotencyKey } : {}),
			retryAttempt: 0,
			...(parsed.data.productCategory != null
				? { productCategory: parsed.data.productCategory }
				: {}),
			...(parsed.data.moods != null ? { moods: parsed.data.moods } : {}),
			...(parsed.data.keywords != null ? { keywords: parsed.data.keywords } : {}),
			...(parsed.data.agenticMode != null ? { agenticMode: parsed.data.agenticMode } : {}),
			agenticPlan,
			...(parsed.data.autoShortformWorkflow != null
				? { autoShortformWorkflow: parsed.data.autoShortformWorkflow }
				: {}),
			...(parsed.data.skipWearableComposite != null
				? { skipWearableComposite: parsed.data.skipWearableComposite }
				: {}),
			...(parsed.data.copy != null ? { copy: parsed.data.copy } : {}),
			...(parsed.data.recentConceptFamilies != null
				? { recentConceptFamilies: parsed.data.recentConceptFamilies }
				: {}),
			...(parsed.data.requestedConceptFamily != null
				? { requestedConceptFamily: parsed.data.requestedConceptFamily }
				: {}),
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
				data: {
					...toJobStatusResponse(created),
					agenticPlan,
				},
			},
			201,
		)
	})

	app.get('/jobs/health/daily-publish', async (c) => {
		const user = c.get('user')
		if (!user) {
			return c.json(UNAUTHORIZED_RESPONSE, 401)
		}

		const now = new Date()
		const windowStart = new Date(now.getTime() - reliabilityPolicy.lookbackHours * 60 * 60 * 1000)

		const [row] = await db
			.select({ succeededCount: count() })
			.from(videoJobs)
			.where(
				and(
					eq(videoJobs.userId, user.id),
					eq(videoJobs.status, 'SUCCEEDED'),
					gte(videoJobs.completedAt, windowStart),
				),
			)

		const rawCount = row?.succeededCount ?? 0
		const succeededCount = typeof rawCount === 'number' ? rawCount : Number(rawCount)
		const health = dailyPublishHealthService.evaluate(succeededCount)

		return c.json({
			success: true,
			data: {
				status: health.status,
				succeededCount: health.succeededCount,
				targetCount: health.targetCount,
				missingCount: health.missingCount,
				shouldAlert: health.shouldAlert,
				lookbackHours: reliabilityPolicy.lookbackHours,
				windowStartAt: windowStart.toISOString(),
				windowEndAt: now.toISOString(),
				alertMessage: health.shouldAlert
					? `최근 ${reliabilityPolicy.lookbackHours}시간 성공 발행이 목표(${health.targetCount}) 미만입니다.`
					: null,
			},
		})
	})

	app.get('/jobs/:jobId/reference-plan', async (c) => {
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

		if (!job.referenceIntake?.normalizedReferenceBrief) {
			return c.json(
				{
					success: false,
					error: {
						code: 'REFERENCE_PLAN_NOT_READY',
						message: 'Reference intake is required before a reference plan can be built',
					},
				},
				409,
			)
		}

		return c.json({
			success: true,
			data: buildOfficialReferenceQueryPlan({
				jobId: job.id,
				normalizedBrief: job.referenceIntake.normalizedReferenceBrief,
			}),
		})
	})

	app.get('/jobs/:jobId/reference-sources', async (c) => {
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

		if (!job.referenceIntake?.normalizedReferenceBrief) {
			return c.json(
				{
					success: false,
					error: {
						code: 'REFERENCE_SOURCES_NOT_READY',
						message: 'Reference intake is required before official discovery targets can be built',
					},
				},
				409,
			)
		}

		return c.json({
			success: true,
			data: buildOfficialReferenceDiscoveryBundle({
				jobId: job.id,
				normalizedBrief: job.referenceIntake.normalizedReferenceBrief,
			}),
		})
	})

	app.get('/jobs/:jobId/reference-sources/probe', async (c) => {
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

		if (!job.referenceIntake?.normalizedReferenceBrief) {
			return c.json(
				{
					success: false,
					error: {
						code: 'REFERENCE_SOURCES_NOT_READY',
						message: 'Reference intake is required before official discovery targets can be built',
					},
				},
				409,
			)
		}

		return c.json({
			success: true,
			data: await probeOfficialReferenceSources({
				bundle: buildOfficialReferenceDiscoveryBundle({
					jobId: job.id,
					normalizedBrief: job.referenceIntake.normalizedReferenceBrief,
				}),
			}),
		})
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
		const orderedRows = [...rows].sort(
			(left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
		)

		const events = orderedRows.map<JobStatusEvent>((row) => {
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
				createdAt:
					typeof row.createdAt === 'string' ? row.createdAt : new Date(row.createdAt).toISOString(),
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
				...(job.referenceIntake ? { referenceIntake: job.referenceIntake } : {}),
			},
		})
	})

	return app
}
