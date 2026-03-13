import type { Platform, StylePreset } from '@1dragon/shared'
import type {
	ConceptCandidate,
	PromptCompilationDebug,
	ShotCard,
	StoryBrief,
	StoryConceptFamily,
} from './planning.js'

export interface I2VGenerateInput {
	readonly provider: 'RUNWAY' | 'HAILUO' | 'GEMINI_VEO' | 'MINIMAX'
	readonly imageUrl: string
	readonly prompt: string
	readonly durationSec: number
	readonly aspectRatio: '9:16'
	readonly fps: 30
	readonly seed?: number
}

export interface I2VGenerateOutput {
	readonly provider: I2VGenerateInput['provider']
	readonly clipUrl: string
	readonly durationSec: number
	readonly metadata: Record<string, unknown>
}

export interface ComposeClipInput {
	readonly foregroundImageUrl: string
	readonly backgroundClipUrls: ReadonlyArray<string>
	readonly subtitleFileUrl?: string
	readonly narrationAudioUrl?: string
	readonly bgmAudioUrl?: string
	readonly watermarkEnabled: boolean
}

export interface ComposeClipOutput {
	readonly masterVideoUrl: string
	readonly durationSec: number
	readonly width: number
	readonly height: number
}

export interface BuildPromptInput {
	readonly productCategory: string
	readonly moods: ReadonlyArray<string>
	readonly keywords: ReadonlyArray<string>
	readonly stylePreset: StylePreset
	readonly copy: {
		readonly hook: string
		readonly description: string
		readonly cta: string
	}
	readonly promptDirectives?: ReadonlyArray<string>
	readonly workflowStages?: ReadonlyArray<string>
	readonly storyBrief?: StoryBrief
	readonly selectedConcept?: ConceptCandidate
	readonly shotCards?: ReadonlyArray<ShotCard>
}

export interface BuildPromptOutput {
	readonly runway: string
	readonly hailuo: string
	readonly geminiVeo: string
	readonly minimax: string
	readonly debug?: PromptCompilationDebug
}

export interface RemoveBackgroundInput {
	readonly imageUrl: string
}

export interface RemoveBackgroundOutput {
	readonly imageUrl: string
	readonly transparentBackground: boolean
}

export interface I2VPort {
	generate(input: I2VGenerateInput): Promise<I2VGenerateOutput>
}

export interface ComposerPort {
	compose(input: ComposeClipInput): Promise<ComposeClipOutput>
	renderVariant(input: {
		readonly masterVideoUrl: string
		readonly platform: Platform
	}): Promise<{ variantUrl: string }>
}

export interface RemoveBgPort {
	removeBackground(input: RemoveBackgroundInput): Promise<RemoveBackgroundOutput>
}

export interface PromptBuilderPort {
	build(input: BuildPromptInput): Promise<BuildPromptOutput>
}

export type MediaQueueName = 'MEDIA_GENERATE'
export type BackoffStrategy = 'EXPONENTIAL'
export type DeadLetterReason =
	| 'MAX_ATTEMPTS_EXCEEDED'
	| 'NON_RETRYABLE_PROVIDER_ERROR'
	| 'PROVIDER_CHAIN_EXHAUSTED'
	| 'UNKNOWN'
export type DailyPublishHealthStatus = 'HEALTHY' | 'AT_RISK' | 'UNHEALTHY'

export interface QueueRetryPolicy {
	readonly maxAttempts: number
	readonly strategy: BackoffStrategy
	readonly baseDelayMs: number
	readonly maxDelayMs: number
}

export interface QueueDeadLetterPolicy {
	readonly queueName: string
	readonly retainFailedForHours: number
	readonly routeReasons: ReadonlyArray<DeadLetterReason>
}

export interface CircuitBreakerPolicy {
	readonly failureThreshold: number
	readonly openDurationMs: number
	readonly halfOpenMaxCalls: number
	readonly successThresholdToClose: number
}

export interface DailyPublishHealthPolicy {
	readonly lookbackHours: number
	readonly targetSuccessCount: number
	readonly warningBelowCount: number
	readonly criticalBelowCount: number
	readonly alertCooldownMinutes: number
}

export interface DailyPublishHealthSnapshot {
	readonly status: DailyPublishHealthStatus
	readonly succeededCount: number
	readonly targetCount: number
	readonly missingCount: number
	readonly shouldAlert: boolean
}

export interface MediaReliabilityPolicyPort {
	getQueueRetryPolicy(queue: MediaQueueName): QueueRetryPolicy
	getQueueDeadLetterPolicy(queue: MediaQueueName): QueueDeadLetterPolicy
	getCircuitBreakerPolicy(): CircuitBreakerPolicy
	getDailyPublishHealthPolicy(): DailyPublishHealthPolicy
}

export interface VideoJobRecord {
	readonly id: string
	readonly userId: string
	readonly status: string
	readonly inputImageUrl: string
	readonly productAnalysisId: string | null
	readonly modelPersonaSelectionId: string | null
	readonly progress: number
	readonly errorMessage: string | null
	readonly retryCount: number
	readonly startedAt: Date | null
	readonly completedAt: Date | null
	readonly createdAt: Date
	readonly updatedAt: Date
}

export interface VideoVariantRecord {
	readonly id: string
	readonly jobId: string
	readonly platform: Platform
	readonly resolution: string
	readonly duration: number
	readonly fileUrl: string | null
	readonly fileSize: number | null
	readonly thumbnailUrl: string | null
	readonly hasWatermark: boolean
	readonly createdAt: Date
	readonly updatedAt: Date
}

export interface VideoJobCreateInput {
	readonly userId: string
	readonly inputImageUrl: string
	readonly id?: string
	readonly productAnalysisId?: string | null
	readonly modelPersonaSelectionId?: string | null
	readonly status?: string
	readonly retryCount?: number
}

export interface VideoVariantCreateInput {
	readonly jobId: string
	readonly platform: Platform
	readonly resolution: string
	readonly duration: number
	readonly fileUrl?: string | null
	readonly fileSize?: number | null
	readonly thumbnailUrl?: string | null
	readonly hasWatermark: boolean
}

export interface VideoJobHistoryQuery {
	readonly limit: number
	readonly offset: number
}

export interface VideoJobRepository {
	create(input: VideoJobCreateInput): Promise<VideoJobRecord>
	findById(jobId: string, userId: string): Promise<VideoJobRecord | null>
	updateStatus(input: {
		readonly jobId: string
		readonly status: string
		readonly progress?: number
		readonly errorMessage?: string | null
		readonly retryCount?: number
		readonly startedAt?: Date
		readonly completedAt?: Date
	}): Promise<VideoJobRecord | null>
	findByUserId(userId: string, query: VideoJobHistoryQuery): Promise<{
		items: VideoJobRecord[]
		total: number
	}>
}

export interface VideoVariantRepository {
	create(input: VideoVariantCreateInput): Promise<VideoVariantRecord>
	findByJobId(jobId: string): Promise<VideoVariantRecord[]>
}
