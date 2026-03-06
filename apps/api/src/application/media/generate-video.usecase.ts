import { PlanTier, type PlanTier as PlanTierType } from '@1dragon/shared'
import {
	ClipAsset,
	StylePresetVO,
	VideoAsset,
	VideoJob,
	VideoResult,
	createJobStatusChangedEvent,
	type JobStatus,
} from '@/domain/media'
import type { ComposerPort, PromptBuilderPort, RemoveBgPort } from '@/domain/media/ports.js'
import { VariantPolicyService } from '@/domain/media/services.js'
import { QualityScoreVO } from '@/domain/media/value-objects.js'
import { QualityControlService } from './quality-control.js'
import { RenderVariantsUseCase } from './render-variants.usecase.js'

type ClipPhase = 'INTRO' | 'DETAIL' | 'CTA'

function resolveClipPhases(targetClipCount: number): ClipPhase[] {
	if (targetClipCount <= 2) {
		return ['INTRO', 'CTA']
	}

	return ['INTRO', 'DETAIL', 'CTA']
}

function buildClipPhaseDirective(phase: ClipPhase): string {
	switch (phase) {
		case 'INTRO':
			return [
				'Scene goal: strong opening reveal with confident product entrance.',
				'Camera: medium-wide framing, smooth dolly-in, light parallax background motion.',
				'Motion rule: move camera/background, keep product shape and print unchanged.',
			].join(' ')
		case 'DETAIL':
			return [
				'Scene goal: highlight material texture and functional details.',
				'Camera: close-up sweep, macro-like detail pass, soft lighting transitions.',
				'Motion rule: no geometric warping, keep seams/logo/text exactly readable.',
			].join(' ')
		case 'CTA':
			return [
				'Scene goal: clean closing hero shot for conversion.',
				'Camera: recentre product, subtle push-in, premium finish lighting.',
				'Motion rule: avoid aggressive distortion and keep brand-safe composition.',
			].join(' ')
	}
}

function buildProviderPromptBundle(
	promptSet: {
		runway: string
		hailuo: string
		geminiVeo: string
		minimax: string
	},
	phaseDirective: string,
): {
	RUNWAY: string
	HAILUO: string
	GEMINI_VEO: string
	MINIMAX: string
} {
	const sharedConstraints =
		'Global constraints: preserve product identity, silhouette, logo and text exactly. no hallucinated accessories. no extra people unless present in source.'

	return {
		RUNWAY: `${promptSet.runway} ${phaseDirective} ${sharedConstraints}`,
		HAILUO: `${promptSet.hailuo} ${phaseDirective} ${sharedConstraints}`,
		GEMINI_VEO: `${promptSet.geminiVeo} ${phaseDirective} ${sharedConstraints}`,
		MINIMAX: `${promptSet.minimax} ${phaseDirective} ${sharedConstraints}`,
	}
}

type I2VRouterPort = {
	generateClip(input: {
		readonly planTier: PlanTierType
		readonly isFirstVideo: boolean
		readonly imageUrl: string
		readonly prompt:
			| string
			| {
					readonly RUNWAY: string
					readonly HAILUO: string
					readonly GEMINI_VEO: string
					readonly MINIMAX: string
			  }
		readonly durationSec: number
		readonly aspectRatio: '9:16'
		readonly fps: 30
		readonly seed?: number
	}): Promise<{
		provider: 'RUNWAY' | 'HAILUO' | 'GEMINI_VEO' | 'MINIMAX'
		clipUrl: string
		durationSec: number
		metadata: Record<string, unknown>
	}>
}

export type GenerateVideoInput = {
	readonly jobId: string
	readonly userId: string
	readonly planTier: PlanTierType
	readonly isFirstVideo: boolean
	readonly currentStatus?: JobStatus
	readonly currentRetryCount?: number
	readonly inputImageUrl: string
	readonly stylePreset: string
	readonly productCategory: string
	readonly moods: ReadonlyArray<string>
	readonly keywords: ReadonlyArray<string>
	readonly copy: {
		readonly hook: string
		readonly description: string
		readonly cta: string
	}
	readonly promptDirectives?: ReadonlyArray<string>
	readonly workflowStages?: ReadonlyArray<string>
	readonly subtitleFileUrl?: string
	readonly narrationAudioUrl?: string
	readonly bgmAudioUrl?: string
	readonly includeWatermark: boolean
}

export type GenerateVideoOutput = {
	readonly job: VideoJob
	readonly status: JobStatus
	readonly qualityScore: number
	readonly shouldRetry: boolean
	readonly events: ReturnType<typeof createJobStatusChangedEvent>[]
}

export class GenerateVideoUseCase {
	private readonly variantPolicy = new VariantPolicyService()

	public constructor(
		private readonly promptBuilder: PromptBuilderPort,
		private readonly i2vRouter: I2VRouterPort,
		private readonly composer: ComposerPort,
		private readonly removeBgPort: RemoveBgPort,
		private readonly qualityControl: QualityControlService,
	) {}

	public async execute(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
		const job = new VideoJob({
			id: input.jobId,
			userId: input.userId,
			inputImageUrl: input.inputImageUrl,
			stylePreset: new StylePresetVO(input.stylePreset),
			status: input.currentStatus ?? 'QUEUED',
			retryCount: input.currentRetryCount ?? 0,
		})

		const events: ReturnType<typeof createJobStatusChangedEvent>[] = []
		let currentStatus: JobStatus = 'QUEUED'

		const transition = (next: JobStatus, metadata: Record<string, unknown> = {}): void => {
			events.push(
				createJobStatusChangedEvent({
					id: crypto.randomUUID(),
					jobId: input.jobId,
					userId: input.userId,
					previousStatus: currentStatus,
					newStatus: next,
					metadata,
				}),
			)
			job.setStatus(next)
			currentStatus = next
		}

		transition('ANALYZING')
		const foreground = await this.removeBgPort.removeBackground({
			imageUrl: input.inputImageUrl,
		})

		transition('GENERATING')
		const promptSet = await this.promptBuilder.build({
			productCategory: input.productCategory,
			moods: input.moods,
			keywords: input.keywords,
			stylePreset: new StylePresetVO(input.stylePreset).value,
			copy: input.copy,
			...(input.promptDirectives ? { promptDirectives: input.promptDirectives } : {}),
			...(input.workflowStages ? { workflowStages: input.workflowStages } : {}),
		})
		const variantDecision = this.variantPolicy.resolveVariants(input.planTier)
		const targetClipCount = input.planTier === PlanTier.FREE ? 2 : 3
		const clipDurationSec = Math.max(5, Math.floor(variantDecision.maxDurationSec / targetClipCount))
		const clipPhases = resolveClipPhases(targetClipCount)

		const generatedClips = await Promise.all(
			Array.from({ length: targetClipCount }).map(async (_, index) => {
				const phase = clipPhases[index] ?? 'CTA'
				const providerPrompts = buildProviderPromptBundle(promptSet, buildClipPhaseDirective(phase))
				const clip = await this.i2vRouter.generateClip({
					planTier: input.planTier,
					isFirstVideo: input.isFirstVideo && index === 0,
					imageUrl: foreground.imageUrl,
					prompt: providerPrompts,
					durationSec: clipDurationSec,
					aspectRatio: '9:16',
					fps: 30,
					seed: Date.now() + index,
				})

				return new ClipAsset({
					id: `clip_${index + 1}`,
					url: clip.clipUrl,
					durationSec: clip.durationSec,
				})
			}),
		)
		job.setClipAssets(generatedClips)

		transition('COMPOSING')
		const composed = await this.composer.compose({
			foregroundImageUrl: foreground.imageUrl,
			backgroundClipUrls: generatedClips.map((clip) => clip.url),
			...(input.subtitleFileUrl ? { subtitleFileUrl: input.subtitleFileUrl } : {}),
			...(input.narrationAudioUrl ? { narrationAudioUrl: input.narrationAudioUrl } : {}),
			...(input.bgmAudioUrl ? { bgmAudioUrl: input.bgmAudioUrl } : {}),
			watermarkEnabled: this.variantPolicy.shouldRenderWatermark(input.planTier, input.includeWatermark),
		})

		transition('RENDERING_VARIANTS')

		const renderVariantsUseCase = new RenderVariantsUseCase(this.composer)
		const rendered = await renderVariantsUseCase.execute({
			jobId: input.jobId,
			planTier: input.planTier,
			masterVideoUrl: composed.masterVideoUrl,
			durationSec: composed.durationSec,
			width: composed.width,
			height: composed.height,
			includeWatermark: input.includeWatermark,
		})

		const quality = this.qualityControl.evaluate({
			originalImageUrl: input.inputImageUrl,
			generatedVideoUrl: composed.masterVideoUrl,
		})

		job.setResult(
			new VideoResult({
				masterAsset: new VideoAsset({
					url: composed.masterVideoUrl,
					durationSec: composed.durationSec,
					width: composed.width,
					height: composed.height,
				}),
				variants: rendered.variants,
				qualityScore: new QualityScoreVO(quality.similarityScore),
			}),
		)

		const shouldRetry = this.qualityControl.shouldRegenerate({
			similarityScore: quality.similarityScore,
			retryCount: job.retryCount,
			maxRetries: 2,
			threshold: 0.7,
		})

		if (quality.passed) {
			transition('SUCCEEDED', { similarityScore: quality.similarityScore })
		} else {
			transition('DEGRADED_FAILED', { similarityScore: quality.similarityScore })
		}

		return {
			job,
			status: job.status.value,
			qualityScore: quality.similarityScore,
			shouldRetry,
			events,
		}
	}
}
