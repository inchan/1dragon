import { randomUUID } from 'node:crypto'
import {
	AgenticWorkflow,
	PlanTier,
	ProductCategory,
	resolveAgenticExecutionPlan,
	type AgenticExecutionPlan,
	type ProductCategory as ProductCategoryType,
} from '@1dragon/shared'
import { Worker, type Job } from 'bullmq'
import { eq } from 'drizzle-orm'
import { NotificationEvent } from '@/domain/notification/entities.js'
import { MediaReliabilityPolicyService } from '@/domain/media/services.js'
import { config } from '@/shared/config.js'
import { db } from '@/infrastructure/persistence/db.js'
import { videoJobs } from '@/infrastructure/persistence/schema.js'
import { GenerateVideoUseCase } from '@/application/media/generate-video.usecase.js'
import { QualityControlService } from '@/application/media/quality-control.js'
import {
	applyShortformWorkflow,
	type ShortformCreativeContext,
} from '@/application/media/shortform-workflow.js'
import { GenerateModelImageUseCase } from '@/application/model-persona/generate-model-image.usecase.js'
import { SelectPersonaUseCase } from '@/application/model-persona/select-persona.usecase.js'
import { createChildLogger } from '@/infrastructure/logging/logger.js'
import { FFmpegComposer } from '@/infrastructure/media/ffmpeg-composer.js'
import { PromptBuilder } from '@/infrastructure/media/prompt-builder.js'
import { sseBroker } from '@/infrastructure/notification/sse-broker.js'
import { appendJobStatusEvent } from '@/infrastructure/persistence/job-event.helper.js'
import {
	ModelPersonaPresetRepositoryImpl,
	ModelPersonaSelectionRepositoryImpl,
} from '@/infrastructure/persistence/repositories/model-persona-selection.repository.js'
import { RemoveBgAdapter } from '@/infrastructure/providers/remove-bg/remove-bg.adapter.js'
import {
	AllI2VProvidersFailedError,
	GeminiVeoI2VAdapter,
	HailuoI2VAdapter,
	I2VProviderError,
	MiniMaxI2VAdapter,
	ProviderRouter,
	RunwayI2VAdapter,
} from '@/infrastructure/providers/i2v'
import {
	QueueName,
	addJob,
	redisConnection,
	type MediaGenerateDlqJobData,
	type MediaGenerateJobData,
} from '../bullmq.config.js'
import { VideoJobRepositoryImpl, VideoVariantRepositoryImpl } from '@/infrastructure/persistence/repositories/video-job.repository.js'
import type { JobStatus } from '@/domain/media/value-objects.js'
import { GeminiModelCompositeAdapter } from '@/infrastructure/providers/image-gen/gemini-model-composite.adapter.js'

const logger = createChildLogger({ provider: QueueName.MEDIA_GENERATE })
const reliabilityPolicy = new MediaReliabilityPolicyService()
const mediaGenerateRetryPolicy = reliabilityPolicy.getQueueRetryPolicy('MEDIA_GENERATE')
const mediaGenerateDlqPolicy = reliabilityPolicy.getQueueDeadLetterPolicy('MEDIA_GENERATE')

const MAX_RETRY_COUNT = Math.max(0, mediaGenerateRetryPolicy.maxAttempts - 1)
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

const PRODUCT_CATEGORY_SET = new Set<string>(Object.values(ProductCategory))
const FOOTWEAR_KEYWORD_PATTERN = /(신발|운동화|스니커|구두|로퍼|샌들|shoe|shoes|sneaker|sneakers|boot|boots|heel|heels)/i
const PROMPT_CHAIN_STAGES = ['입력 분석', '프롬프트 설계', '영상 생성', '품질 평가'] as const
const PROMPT_CHAIN_DIRECTIVES = [
	'Execute as a prompt chain: analyze product signals first, then design the scene prompt, then generate the final video.',
	'Preserve product identity across every stage and reuse prior stage outputs consistently.',
] as const

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

function canRetryByPolicy(retryCount: number): boolean {
	return retryCount <= MAX_RETRY_COUNT
}

function appendUniqueValues(
	base: ReadonlyArray<string>,
	extras: ReadonlyArray<string>,
): string[] {
	const seen = new Set<string>()
	const merged: string[] = []

	for (const value of [...base, ...extras]) {
		const normalized = value.trim()
		if (normalized.length === 0) {
			continue
		}

		const key = normalized.toLowerCase()
		if (seen.has(key)) {
			continue
		}

		seen.add(key)
		merged.push(normalized)
	}

	return merged
}

function resolveDeadLetterReason(error: unknown): MediaGenerateDlqJobData['reason'] {
	if (error instanceof AllI2VProvidersFailedError) {
		return 'PROVIDER_CHAIN_EXHAUSTED'
	}

	if (error instanceof I2VProviderError && error.retryable === false) {
		return 'NON_RETRYABLE_PROVIDER_ERROR'
	}

	if (error instanceof I2VProviderError) {
		return 'MAX_ATTEMPTS_EXCEEDED'
	}

	return 'UNKNOWN'
}

function normalizeProductCategory(value: string | undefined): ProductCategoryType {
	const normalized = value?.trim().toUpperCase() ?? ProductCategory.OTHER
	if (PRODUCT_CATEGORY_SET.has(normalized)) {
		return normalized as ProductCategoryType
	}
	return ProductCategory.OTHER
}

function normalizeCreativeContext(
	context: MediaGenerateJobData['creativeContext'] | undefined,
): ShortformCreativeContext | undefined {
	if (!context) {
		return undefined
	}

	const traits = context.traits
		?.map((value) => value.trim())
		.filter((value) => value.length > 0)
	const normalized = {
		...(context.location?.trim() ? { location: context.location.trim() } : {}),
		...(context.profession?.trim() ? { profession: context.profession.trim() } : {}),
		...(context.identity?.trim() ? { identity: context.identity.trim() } : {}),
		...(traits && traits.length > 0 ? { traits } : {}),
		...(context.visualStyle?.trim() ? { visualStyle: context.visualStyle.trim() } : {}),
	}

	return Object.keys(normalized).length > 0 ? normalized : undefined
}

function shouldApplyWearableComposite(input: {
	readonly category: ProductCategoryType
	readonly keywords: ReadonlyArray<string>
}): boolean {
	if (input.category === ProductCategory.FASHION || input.category === ProductCategory.SPORTS) {
		return true
	}

	if (input.category === ProductCategory.ACCESSORIES) {
		return input.keywords.some((keyword) => FOOTWEAR_KEYWORD_PATTERN.test(keyword))
	}

	return false
}

function buildPersonaTargetAudienceText(input: {
	readonly copy: {
		readonly hook: string
		readonly description: string
		readonly cta: string
	}
	readonly keywords: ReadonlyArray<string>
}): string {
	return [input.copy.hook, input.copy.description, input.copy.cta, ...input.keywords]
		.map((value) => value.trim())
		.filter(Boolean)
		.join(' ')
}

function buildMissionPromptDirectives(mission: AgenticExecutionPlan['mission']): string[] {
	return [
		`Operating soul: ${mission.soul}`,
		`Purpose: ${mission.purpose}`,
		`Operating philosophy: ${mission.philosophy.join(' | ')}`,
		...mission.goals.map(
			(goal, index) =>
				`Goal ${index + 1}: ${goal.name}. Outcome: ${goal.outcome} Success signal: ${goal.successSignal}`,
		),
		`Definition of done: ${mission.successCriteria.join(' | ')}`,
	]
}

async function resolvePersonaPreset(input: {
	readonly repository: ModelPersonaPresetRepositoryImpl
	readonly personaId?: string
	readonly category: ProductCategoryType
	readonly targetAudienceText: string
}) {
	if (input.personaId) {
		const preset = await input.repository.findById(input.personaId)
		if (preset) {
			return preset
		}
	}

	const selector = new SelectPersonaUseCase(input.repository)
	const selected = await selector.execute({
		detectedCategory: input.category,
		targetAudience: input.targetAudienceText,
	})

	return selected.recommendations[0] ?? selected.presets[0] ?? null
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
	const agenticPlan =
		job.data.agenticPlan ??
		resolveAgenticExecutionPlan({
			...(job.data.agenticMode ? { agenticMode: job.data.agenticMode } : {}),
			...(job.data.productCategory ? { productCategory: job.data.productCategory } : {}),
			...(job.data.keywords ? { keywords: job.data.keywords } : {}),
			...(job.data.autoShortformWorkflow !== undefined
				? { autoShortformWorkflow: job.data.autoShortformWorkflow }
				: {}),
			...(job.data.skipWearableComposite !== undefined
				? { skipWearableComposite: job.data.skipWearableComposite }
				: {}),
			...(job.data.personaId ? { personaId: job.data.personaId } : {}),
			...(job.data.creativeContext ? { creativeContext: job.data.creativeContext } : {}),
			duration: job.data.options.duration,
		})
	const isFirstVideo = job.data.options.isFirstVideo === true
	const productCategory = normalizeProductCategory(job.data.productCategory)
	const baseMoods = job.data.moods ?? ['PROFESSIONAL']
	const baseKeywords = job.data.keywords ?? []
	const baseCopy = job.data.copy ?? DEFAULT_COPY
	const creativeContext = normalizeCreativeContext(job.data.creativeContext)
	const shortformWorkflow = applyShortformWorkflow({
		enabled: agenticPlan.features.shortformWorkflow,
		productCategory,
		moods: baseMoods,
		keywords: baseKeywords,
		copy: baseCopy,
		...(creativeContext ? { context: creativeContext } : {}),
	})
	const missionDirectives = buildMissionPromptDirectives(agenticPlan.mission)
	const promptDirectives = appendUniqueValues(
		missionDirectives,
		agenticPlan.workflow === AgenticWorkflow.PROMPT_CHAIN
			? appendUniqueValues(shortformWorkflow.promptDirectives, PROMPT_CHAIN_DIRECTIVES)
			: [...shortformWorkflow.promptDirectives],
	)
	const workflowStages =
		agenticPlan.workflow === AgenticWorkflow.PROMPT_CHAIN
			? appendUniqueValues(shortformWorkflow.workflowStages, PROMPT_CHAIN_STAGES)
			: [...shortformWorkflow.workflowStages]
	const moods = [...shortformWorkflow.moods]
	const keywords = [...shortformWorkflow.keywords]
	const copy = { ...shortformWorkflow.copy }

	logger.info(
		{
			jobId,
			userId,
			agenticMode: agenticPlan.mode,
			agenticWorkflow: agenticPlan.workflow,
			agenticRouting: agenticPlan.routing,
			agenticPurpose: agenticPlan.mission.purpose,
			agenticGoals: agenticPlan.mission.goals.map((goal) => goal.name),
		},
		'resolved agentic execution plan',
	)

	const currentStatus = existing.status as JobStatus
	const currentRetryCount = buildRetryCount(existing.retryCount)
	let lastKnownStatus = currentStatus
	const persistedTransitionIds = new Set<string>()
	let inputImageUrl = job.data.imageUrl
	let modelCompositeApplied = false
	let modelPersonaSelectionId: string | null = existing.modelPersonaSelectionId

	if (
		agenticPlan.features.wearableComposite &&
		shouldApplyWearableComposite({ category: productCategory, keywords })
	) {
		try {
			const presetRepository = new ModelPersonaPresetRepositoryImpl()
			const selectionRepository = new ModelPersonaSelectionRepositoryImpl()
			const personaPreset = await resolvePersonaPreset({
				repository: presetRepository,
				...(job.data.personaId ? { personaId: job.data.personaId } : {}),
				category: productCategory,
				targetAudienceText: buildPersonaTargetAudienceText({ copy, keywords }),
			})

			if (personaPreset) {
				const compositeAdapter = new GeminiModelCompositeAdapter({
					...(config.GEMINI_IMAGEN_API_KEY
						? { apiKey: config.GEMINI_IMAGEN_API_KEY }
						: config.GEMINI_VEO_API_KEY
							? { apiKey: config.GEMINI_VEO_API_KEY }
							: {}),
				})
				const generateModelImageUseCase = new GenerateModelImageUseCase(
					compositeAdapter,
					selectionRepository,
				)
				const compositeResult = await generateModelImageUseCase.execute({
					userId,
					jobId,
					productImageUrl: job.data.imageUrl,
					productCategory,
					productKeywords: keywords,
					preset: personaPreset,
					productName: copy.description,
				})

				const selection = await selectionRepository.findByJobId(jobId)
				if (selection?.id) {
					modelPersonaSelectionId = selection.id
				}

				if (compositeResult.accepted && compositeResult.generatedImageUrl) {
					inputImageUrl = compositeResult.generatedImageUrl
					modelCompositeApplied = true
				}

				if (modelPersonaSelectionId) {
					await db
						.update(videoJobs)
						.set({
							modelPersonaSelectionId,
							updatedAt: new Date(),
						})
						.where(eq(videoJobs.id, jobId))
				}

				logger.info(
					{
						jobId,
						userId,
						productCategory,
						modelCompositeApplied,
						modelPersonaSelectionId,
						qualityScore: compositeResult.qualityScore,
					},
					'wearable composite pre-processing completed',
				)
			}
		} catch (error) {
			logger.warn(
				{
					jobId,
					userId,
					productCategory,
					error: error instanceof Error ? error.message : String(error),
				},
				'wearable composite pre-processing failed, fallback to original product image',
			)
		}
	}

	try {
		const generated = await useCase.execute({
			jobId,
			userId,
			planTier,
			isFirstVideo,
			inputImageUrl,
			stylePreset: job.data.options.stylePreset ?? 'SIMPLE',
			productCategory,
			moods,
			keywords,
			copy,
			...(job.data.recentConceptFamilies
				? { recentConceptFamilies: job.data.recentConceptFamilies }
				: {}),
			...(job.data.requestedConceptFamily
				? { requestedConceptFamily: job.data.requestedConceptFamily }
				: {}),
			...(promptDirectives.length > 0 || workflowStages.length > 0
				? {
					promptDirectives,
					workflowStages,
				}
				: {}),
			includeWatermark: planTier === PlanTier.FREE,
			currentStatus,
			currentRetryCount,
			onTransition: async (transition) => {
				lastKnownStatus = transition.newStatus
				if (transition.newStatus === 'SUCCEEDED' || transition.newStatus === 'DEGRADED_FAILED') {
					return
				}

				await persistJobTransition(repository, {
					jobId,
					userId,
					previousStatus: transition.previousStatus,
					newStatus: transition.newStatus,
					retryCount: currentRetryCount,
					metadata: {
						...transition.metadata,
						stage: 'generate-worker',
						agenticMode: agenticPlan.mode,
						agenticWorkflow: agenticPlan.workflow,
						agenticRouting: agenticPlan.routing,
						agenticReasoning: agenticPlan.reasoning,
						agenticSteps: agenticPlan.steps,
						agenticSoul: agenticPlan.mission.soul,
						agenticPurpose: agenticPlan.mission.purpose,
						agenticPhilosophy: agenticPlan.mission.philosophy,
						agenticGoals: agenticPlan.mission.goals.map((goal) => goal.name),
						agenticSuccessCriteria: agenticPlan.mission.successCriteria,
						modelCompositeApplied,
						shortformWorkflowApplied: shortformWorkflow.enabled,
						...(workflowStages.length > 0
							? {
								shortformWorkflowStages: workflowStages,
								trendSnapshotDate: shortformWorkflow.trendSnapshotDate,
							}
							: {}),
						...(modelPersonaSelectionId ? { modelPersonaSelectionId } : {}),
					},
					errorMessage: null,
				})
				persistedTransitionIds.add(transition.id)
			},
		})
		for (const transition of generated.events) {
			if (persistedTransitionIds.has(transition.id)) {
				continue
			}

			lastKnownStatus = transition.newStatus
			await persistJobTransition(repository, {
				jobId,
				userId,
				previousStatus: transition.previousStatus,
				newStatus: transition.newStatus,
				retryCount: generated.job.retryCount,
				metadata: {
					...transition.metadata,
					stage: 'generate-worker',
					agenticMode: agenticPlan.mode,
					agenticWorkflow: agenticPlan.workflow,
					agenticRouting: agenticPlan.routing,
					agenticReasoning: agenticPlan.reasoning,
					agenticSteps: agenticPlan.steps,
					agenticSoul: agenticPlan.mission.soul,
					agenticPurpose: agenticPlan.mission.purpose,
					agenticPhilosophy: agenticPlan.mission.philosophy,
					agenticGoals: agenticPlan.mission.goals.map((goal) => goal.name),
					agenticSuccessCriteria: agenticPlan.mission.successCriteria,
					modelCompositeApplied,
					shortformWorkflowApplied: shortformWorkflow.enabled,
					...(workflowStages.length > 0
						? {
							shortformWorkflowStages: workflowStages,
							trendSnapshotDate: shortformWorkflow.trendSnapshotDate,
						}
						: {}),
					...(modelPersonaSelectionId ? { modelPersonaSelectionId } : {}),
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
				completedAt:
					generated.status === 'SUCCEEDED' || generated.status === 'DEGRADED_FAILED'
						? new Date()
						: null,
				updatedAt: new Date(),
				...(modelPersonaSelectionId ? { modelPersonaSelectionId } : {}),
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
			agenticWorkflow: agenticPlan.workflow,
		}
	} catch (error) {
		const nextRetryCount = buildRetryCount(currentRetryCount + 1)
		const queueHasMoreAttempts = (job.opts.attempts ?? 1) > job.attemptsMade + 1
		const retryableByError =
			!(error instanceof I2VProviderError) || error.retryable === true
		const shouldRetry =
			queueHasMoreAttempts &&
			retryableByError &&
			canRetryByPolicy(nextRetryCount)

		const finalStatus = shouldRetry ? 'DEGRADED_FAILED' : 'FAILED'
		const errorMessage = error instanceof Error ? error.message : '영상 생성 처리 중 오류가 발생했습니다.'

		await persistJobTransition(repository, {
			jobId,
			userId,
			previousStatus: lastKnownStatus,
			newStatus: finalStatus,
			retryCount: nextRetryCount,
			errorMessage,
			metadata: {
				reason: 'worker_exception',
				canRetry: shouldRetry,
				agenticMode: agenticPlan.mode,
				agenticWorkflow: agenticPlan.workflow,
				agenticPurpose: agenticPlan.mission.purpose,
				agenticGoals: agenticPlan.mission.goals.map((goal) => goal.name),
			},
		})

		if (shouldRetry) {
			throw error
		}

		const deadLetterReason = resolveDeadLetterReason(error)
		if (mediaGenerateDlqPolicy.routeReasons.includes(deadLetterReason)) {
			const attemptsMade = Math.max(1, job.attemptsMade + 1)
			try {
				await addJob(
					QueueName.MEDIA_GENERATE_DLQ,
					{
						jobId,
						userId,
						reason: deadLetterReason,
						errorMessage,
						attemptsMade,
						maxAttempts: mediaGenerateRetryPolicy.maxAttempts,
						sourceQueue: QueueName.MEDIA_GENERATE,
						failedAt: new Date().toISOString(),
						metadata: {
							previousStatus: lastKnownStatus,
							finalStatus,
							retryCount: nextRetryCount,
							queueAttemptsConfigured: job.opts.attempts ?? mediaGenerateRetryPolicy.maxAttempts,
						},
					},
					{ jobId: `${jobId}:dlq:${Date.now()}` },
				)
				logger.error(
					{
						jobId,
						userId,
						reason: deadLetterReason,
						dlqQueue: mediaGenerateDlqPolicy.queueName,
					},
					'media generation job routed to dead-letter queue',
				)
			} catch (dlqError) {
				logger.error(
					{
						jobId,
						userId,
						reason: deadLetterReason,
						error: dlqError instanceof Error ? dlqError.message : String(dlqError),
					},
					'failed to route media generation job to dead-letter queue',
				)
			}
		}

		return {
			jobId,
			status: finalStatus,
			qualityScore: 0,
			shouldRetry: false,
			eventCount: 0,
			agenticWorkflow: agenticPlan.workflow,
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
