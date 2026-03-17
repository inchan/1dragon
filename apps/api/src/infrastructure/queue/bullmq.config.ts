import { Queue, type Job, type QueueOptions } from 'bullmq'
import IORedis from 'ioredis'
import type {
	AgenticExecutionPlan,
	AgenticMode,
	NormalizedReferenceBrief,
	PlanTier,
	ReferenceBrief,
	StoryConceptFamily,
} from '@1dragon/shared'
import { MediaReliabilityPolicyService } from '@/domain/media/services.js'
import { config } from '../../shared/config.js'

// Redis connection singleton
export const redisConnection = new IORedis(config.REDIS_URL, {
	maxRetriesPerRequest: null,
	enableReadyCheck: false,
})

// Queue names (colons not allowed in BullMQ v5+)
export const QueueName = {
	MEDIA_ANALYZE: 'media-analyze',
	MEDIA_GENERATE: 'media-generate',
	MEDIA_GENERATE_DLQ: 'media-generate-dlq',
	MEDIA_COMPOSE: 'media-compose',
	MEDIA_RENDER_VARIANT: 'media-render-variant',
	NOTIFICATION_DISPATCH: 'notification-dispatch',
} as const

export type QueueNameType = (typeof QueueName)[keyof typeof QueueName]

const reliabilityPolicy = new MediaReliabilityPolicyService()
const mediaGenerateRetryPolicy = reliabilityPolicy.getQueueRetryPolicy('MEDIA_GENERATE')
const mediaGenerateDeadLetterPolicy = reliabilityPolicy.getQueueDeadLetterPolicy('MEDIA_GENERATE')

// Default queue options
const defaultQueueOptions: QueueOptions = {
	connection: redisConnection,
	defaultJobOptions: {
		attempts: mediaGenerateRetryPolicy.maxAttempts,
		backoff: {
			type: mediaGenerateRetryPolicy.strategy.toLowerCase() as 'exponential',
			delay: mediaGenerateRetryPolicy.baseDelayMs,
		},
		removeOnComplete: {
			age: 24 * 3600, // 24 hours
			count: 1000,
		},
		removeOnFail: {
			age: 7 * 24 * 3600, // 7 days
			count: 5000,
		},
	},
}

const deadLetterQueueOptions: QueueOptions = {
	connection: redisConnection,
	defaultJobOptions: {
		attempts: 1,
		removeOnComplete: {
			age: 24 * 3600,
			count: 500,
		},
		removeOnFail: {
			age: mediaGenerateDeadLetterPolicy.retainFailedForHours * 3600,
			count: 10_000,
		},
	},
}

// Queue instances
export const queues = {
	[QueueName.MEDIA_ANALYZE]: new Queue(QueueName.MEDIA_ANALYZE, defaultQueueOptions),
	[QueueName.MEDIA_GENERATE]: new Queue(QueueName.MEDIA_GENERATE, defaultQueueOptions),
	[QueueName.MEDIA_GENERATE_DLQ]: new Queue(
		QueueName.MEDIA_GENERATE_DLQ,
		deadLetterQueueOptions,
	),
	[QueueName.MEDIA_COMPOSE]: new Queue(QueueName.MEDIA_COMPOSE, defaultQueueOptions),
	[QueueName.MEDIA_RENDER_VARIANT]: new Queue(QueueName.MEDIA_RENDER_VARIANT, defaultQueueOptions),
	[QueueName.NOTIFICATION_DISPATCH]: new Queue(
		QueueName.NOTIFICATION_DISPATCH,
		defaultQueueOptions,
	),
} as const

// Queue job data types
export interface MediaAnalyzeJobData {
	mediaId: string
	userId: string
	fileUrl: string
}

export interface MediaGenerateJobData {
	projectId: string
	userId: string
	imageUrl: string
	referenceBrief?: ReferenceBrief
	normalizedReferenceBrief?: NormalizedReferenceBrief
	personaId?: string
	retryAttempt?: number
	idempotencyKey?: string
	productCategory?: string
	moods?: string[]
	keywords?: string[]
	agenticMode?: AgenticMode
	agenticPlan?: AgenticExecutionPlan
	autoShortformWorkflow?: boolean
	skipWearableComposite?: boolean
	creativeContext?: {
		location?: string
		profession?: string
		identity?: string
		traits?: string[]
		visualStyle?: string
	}
	copy?: {
		hook: string
		description: string
		cta: string
	}
	recentConceptFamilies?: StoryConceptFamily[]
	requestedConceptFamily?: StoryConceptFamily
	options: {
		duration: number
		stylePreset?: string
		planTier?: PlanTier
		isFirstVideo?: boolean
	}
}

export interface MediaGenerateDlqJobData {
	jobId: string
	userId: string
	reason: 'MAX_ATTEMPTS_EXCEEDED' | 'NON_RETRYABLE_PROVIDER_ERROR' | 'PROVIDER_CHAIN_EXHAUSTED' | 'UNKNOWN'
	errorMessage: string
	attemptsMade: number
	maxAttempts: number
	sourceQueue: typeof QueueName.MEDIA_GENERATE
	failedAt: string
	metadata?: Record<string, unknown>
}

export interface MediaComposeJobData {
	projectId: string
	userId: string
	segments: Array<{
		url: string
		startTime: number
		duration: number
	}>
	outputFormat: 'mp4' | 'mov'
}

export interface MediaRenderVariantJobData {
	projectId: string
	userId: string
	platform: 'youtube' | 'instagram' | 'tiktok'
	baseVideoUrl: string
}

export interface NotificationDispatchJobData {
	userId: string
	type: 'email' | 'push' | 'sms'
	template: string
	variables: Record<string, string>
}

// Type mapping for job data
export type JobDataMap = {
	[QueueName.MEDIA_ANALYZE]: MediaAnalyzeJobData
	[QueueName.MEDIA_GENERATE]: MediaGenerateJobData
	[QueueName.MEDIA_GENERATE_DLQ]: MediaGenerateDlqJobData
	[QueueName.MEDIA_COMPOSE]: MediaComposeJobData
	[QueueName.MEDIA_RENDER_VARIANT]: MediaRenderVariantJobData
	[QueueName.NOTIFICATION_DISPATCH]: NotificationDispatchJobData
}

// Helper function to add jobs with type safety
export async function addJob<T extends QueueNameType>(
	queueName: T,
	data: JobDataMap[T],
	options?: { priority?: number; delay?: number; jobId?: string },
): Promise<Job<JobDataMap[T]>> {
	const queue = queues[queueName]
	return queue.add(queueName, data, options)
}

// Graceful shutdown helper
export async function closeQueues(): Promise<void> {
	await Promise.all(Object.values(queues).map((queue) => queue.close()))
	await redisConnection.quit()
}
