import { PlanTier, type PlanTier as PlanTierType } from '@1dragon/shared'
import {
	ClipAsset,
	type PromptCompileShotMapping,
	type StoryConceptFamily,
	type StoryPlanningArtifacts,
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
import { reviewPromptCompilation, reviewShotPlan, reviewStoryBrief } from './review-gates.js'
import { RenderVariantsUseCase } from './render-variants.usecase.js'
import { planStory } from './story-planner.js'

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
	shotMapping?: PromptCompileShotMapping['providerSegments'],
): {
	RUNWAY: string
	HAILUO: string
	GEMINI_VEO: string
	MINIMAX: string
} {
	const sharedConstraints =
		'Global constraints: preserve product identity, silhouette, logo and text exactly. no hallucinated accessories. no extra people unless present in source.'

	return {
		RUNWAY: `${promptSet.runway} ${shotMapping?.runway ?? phaseDirective} ${phaseDirective} ${sharedConstraints}`,
		HAILUO: `${promptSet.hailuo} ${shotMapping?.hailuo ?? phaseDirective} ${phaseDirective} ${sharedConstraints}`,
		GEMINI_VEO: `${promptSet.geminiVeo} ${shotMapping?.geminiVeo ?? phaseDirective} ${phaseDirective} ${sharedConstraints}`,
		MINIMAX: `${promptSet.minimax} ${shotMapping?.minimax ?? phaseDirective} ${phaseDirective} ${sharedConstraints}`,
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
	readonly recentConceptFamilies?: ReadonlyArray<StoryConceptFamily>
	readonly requestedConceptFamily?: StoryConceptFamily
	readonly onTransition?: (
		event: ReturnType<typeof createJobStatusChangedEvent>,
	) => Promise<void> | void
}

export type GenerateVideoOutput = {
	readonly job: VideoJob
	readonly status: JobStatus
	readonly qualityScore: number
	readonly shouldRetry: boolean
	readonly events: ReturnType<typeof createJobStatusChangedEvent>[]
	readonly planning?: StoryPlanningArtifacts
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
		const targetClipCount = input.planTier === PlanTier.FREE ? 2 : 3
		const planning = planStory({
			jobId: input.jobId,
			inputImageUrl: input.inputImageUrl,
			productCategory: input.productCategory,
			stylePreset: new StylePresetVO(input.stylePreset).value,
			moods: input.moods,
			keywords: input.keywords,
			copy: input.copy,
			targetClipCount,
			...(input.recentConceptFamilies ? { recentConceptFamilies: input.recentConceptFamilies } : {}),
			...(input.requestedConceptFamily ? { requestedConceptFamily: input.requestedConceptFamily } : {}),
		})
		const storyBriefReview = reviewStoryBrief(planning.storyBrief)
		if (storyBriefReview.decision.outcome !== 'APPROVED') {
			throw new Error(`Story brief review failed: ${storyBriefReview.decision.rationale}`)
		}
		const shotPlanReview = reviewShotPlan(planning.shotCards)
		if (shotPlanReview.decision.outcome !== 'APPROVED') {
			throw new Error(`Shot plan review failed: ${shotPlanReview.decision.rationale}`)
		}

		const transition = async (
			next: JobStatus,
			metadata: Record<string, unknown> = {},
		): Promise<void> => {
			const event = createJobStatusChangedEvent({
				id: crypto.randomUUID(),
				jobId: input.jobId,
				userId: input.userId,
				previousStatus: currentStatus,
				newStatus: next,
				metadata,
			})
			events.push(event)
			job.setStatus(next)
			currentStatus = next
			await input.onTransition?.(event)
		}

		await transition('ANALYZING')
		const foreground = await this.removeBgPort.removeBackground({
			imageUrl: input.inputImageUrl,
		})

		await transition('GENERATING')
		const promptSet = await this.promptBuilder.build({
			productCategory: input.productCategory,
			moods: input.moods,
			keywords: input.keywords,
			stylePreset: new StylePresetVO(input.stylePreset).value,
			copy: input.copy,
			...(input.promptDirectives ? { promptDirectives: input.promptDirectives } : {}),
			...(input.workflowStages ? { workflowStages: input.workflowStages } : {}),
			storyBrief: planning.storyBrief,
			selectedConcept: planning.selectedConcept,
			shotCards: planning.shotCards,
		})
		const promptCompilationReview = reviewPromptCompilation(planning.shotCards, promptSet)
		if (promptCompilationReview.decision.outcome !== 'APPROVED') {
			throw new Error(`Prompt compilation review failed: ${promptCompilationReview.decision.rationale}`)
		}
		const planningArtifacts: StoryPlanningArtifacts = {
			storyBrief: planning.storyBrief,
			conceptCandidates: planning.conceptCandidates,
			selectedConcept: planning.selectedConcept,
			shotCards: planning.shotCards,
			reviewArtifacts: [storyBriefReview, shotPlanReview, promptCompilationReview],
			...(promptSet.debug ? { promptCompilation: promptSet.debug } : {}),
		}
		const variantDecision = this.variantPolicy.resolveVariants(input.planTier)
		const clipDurationSec = Math.max(5, Math.floor(variantDecision.maxDurationSec / targetClipCount))
		const clipPhases = resolveClipPhases(targetClipCount)

		const generatedClips = await Promise.all(
			Array.from({ length: targetClipCount }).map(async (_, index) => {
				const phase = clipPhases[index] ?? 'CTA'
				const providerPrompts = buildProviderPromptBundle(
					promptSet,
					buildClipPhaseDirective(phase),
					promptSet.debug?.shotMappings[index]?.providerSegments,
				)
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

		await transition('COMPOSING')
		const composed = await this.composer.compose({
			foregroundImageUrl: foreground.imageUrl,
			backgroundClipUrls: generatedClips.map((clip) => clip.url),
			...(input.subtitleFileUrl ? { subtitleFileUrl: input.subtitleFileUrl } : {}),
			...(input.narrationAudioUrl ? { narrationAudioUrl: input.narrationAudioUrl } : {}),
			...(input.bgmAudioUrl ? { bgmAudioUrl: input.bgmAudioUrl } : {}),
			watermarkEnabled: this.variantPolicy.shouldRenderWatermark(input.planTier, input.includeWatermark),
		})

		await transition('RENDERING_VARIANTS')

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
		const planningTrace = {
			selectedConceptFamily: planning.selectedConcept.family,
			storySummary:
				promptSet.debug?.storySummary ??
				`${planning.selectedConcept.family}:${planning.selectedConcept.hook}`,
			reviewDecisionTrace: planningArtifacts.reviewArtifacts.map((artifact) => ({
				stage: artifact.stage,
				outcome: artifact.decision.outcome,
				nextStep: artifact.nextStep,
			})),
		}

		if (quality.passed) {
			await transition('SUCCEEDED', {
				similarityScore: quality.similarityScore,
				...planningTrace,
			})
		} else {
			await transition('DEGRADED_FAILED', {
				similarityScore: quality.similarityScore,
				...planningTrace,
			})
		}

		return {
			job,
			status: job.status.value,
			qualityScore: quality.similarityScore,
			shouldRetry,
			events,
			planning: planningArtifacts,
		}
	}
}
