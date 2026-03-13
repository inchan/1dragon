import { PlanTier } from '@1dragon/shared'
import { describe, expect, it } from 'vitest'
import type {
	ComposerPort,
	BuildPromptInput,
	I2VGenerateOutput,
	PromptBuilderPort,
	RemoveBgPort,
} from '@/domain/media/ports.js'
import type { PromptCompileShotMapping } from '@/domain/media'
import { GenerateVideoUseCase } from './generate-video.usecase.js'
import { QualityControlService } from './quality-control.js'

function buildShotMappings(
	input: Pick<BuildPromptInput, 'shotCards'>,
): ReadonlyArray<PromptCompileShotMapping> {
	return (
		input.shotCards?.map((shotCard) => ({
			shotCardId: shotCard.id,
			phase: shotCard.phase,
			sceneIntent: shotCard.sceneIntent,
			proofTarget: shotCard.proofTarget,
			payoff: shotCard.payoff,
			providerSegments: {
				runway: `${shotCard.sceneIntent} ${shotCard.proofTarget} ${shotCard.payoff}`,
				hailuo: `${shotCard.sceneIntent} ${shotCard.proofTarget} ${shotCard.payoff}`,
				geminiVeo: `${shotCard.sceneIntent} ${shotCard.proofTarget} ${shotCard.payoff}`,
				minimax: `${shotCard.sceneIntent} ${shotCard.proofTarget} ${shotCard.payoff}`,
			},
		})) ?? []
	)
}

class StubPromptBuilder implements PromptBuilderPort {
	public async build(input: BuildPromptInput) {
		const shotMappings = buildShotMappings(input)
		return {
			runway: 'runway prompt',
			hailuo: 'hailuo prompt',
			geminiVeo: 'gemini prompt',
			minimax: 'minimax prompt',
			debug: {
				storySummary: input.selectedConcept?.hook ?? 'story-summary',
				selectedConceptFamily: input.selectedConcept?.family ?? 'DETAIL_PROOF',
				shotMappings,
			},
		}
	}
}

class StubRouter {
	public calls = 0

	public async generateClip(): Promise<I2VGenerateOutput> {
		this.calls += 1
		return {
			provider: 'RUNWAY',
			clipUrl: 'https://cdn.example.com/clip.mp4',
			durationSec: 10,
			metadata: {},
		}
	}
}

class StubComposer implements ComposerPort {
	public async compose() {
		return {
			masterVideoUrl: 'https://cdn.example.com/master.mp4',
			durationSec: 30,
			width: 1080,
			height: 1920,
		}
	}

	public async renderVariant() {
		return { variantUrl: 'https://cdn.example.com/variant.mp4' }
	}
}

class StubRemoveBg implements RemoveBgPort {
	public async removeBackground() {
		return {
			imageUrl: 'https://cdn.example.com/foreground.png',
			transparentBackground: true,
		}
	}
}

describe('GenerateVideoUseCase', () => {
	it('orchestrates end-to-end generation pipeline', async () => {
		const useCase = new GenerateVideoUseCase(
			new StubPromptBuilder(),
			new StubRouter(),
			new StubComposer(),
			new StubRemoveBg(),
			new QualityControlService(0.5),
		)

		const result = await useCase.execute({
			jobId: 'job_1',
			userId: 'user_1',
			planTier: PlanTier.STARTER,
			isFirstVideo: true,
			inputImageUrl: 'https://cdn.example.com/input.png',
			stylePreset: 'TRENDY',
			productCategory: 'FASHION',
			moods: ['TRENDY'],
			keywords: ['dress'],
			copy: {
				hook: 'hook',
				description: 'desc',
				cta: 'cta',
			},
			includeWatermark: false,
		})

		expect(result.events.length).toBeGreaterThanOrEqual(5)
		expect(['SUCCEEDED', 'DEGRADED_FAILED']).toContain(result.status)
		expect(result.job.result?.masterAsset.url).toBe('https://cdn.example.com/master.mp4')
		expect(result.planning?.reviewArtifacts).toHaveLength(3)
		expect(result.planning?.promptCompilation?.shotMappings).toHaveLength(3)
		expect(result.planning?.reviewArtifacts.map((artifact) => artifact.stage)).toEqual([
			'STORY_BRIEF',
			'SHOT_PLAN',
			'PROMPT_COMPILATION',
		])
		expect(result.events.at(-1)?.metadata.selectedConceptFamily).toBe(
			result.planning?.selectedConcept.family,
		)
	})

	it('invokes transition callbacks in pipeline order', async () => {
		const useCase = new GenerateVideoUseCase(
			new StubPromptBuilder(),
			new StubRouter(),
			new StubComposer(),
			new StubRemoveBg(),
			new QualityControlService(0.5),
		)
		const transitions: string[] = []

		await useCase.execute({
			jobId: 'job_2',
			userId: 'user_2',
			planTier: PlanTier.STARTER,
			isFirstVideo: false,
			inputImageUrl: 'https://cdn.example.com/input.png',
			stylePreset: 'TRENDY',
			productCategory: 'FASHION',
			moods: ['TRENDY'],
			keywords: ['dress'],
			copy: {
				hook: 'hook',
				description: 'desc',
				cta: 'cta',
			},
			includeWatermark: false,
			onTransition: async (event) => {
				transitions.push(`${event.previousStatus}->${event.newStatus}`)
			},
		})

		expect(transitions.slice(0, 4)).toEqual([
			'QUEUED->ANALYZING',
			'ANALYZING->GENERATING',
			'GENERATING->COMPOSING',
			'COMPOSING->RENDERING_VARIANTS',
		])
		expect([
			'RENDERING_VARIANTS->SUCCEEDED',
			'RENDERING_VARIANTS->DEGRADED_FAILED',
		]).toContain(transitions[4])
	})

	it('stops before provider execution when prompt fact-check fails', async () => {
		class InvalidPromptBuilder implements PromptBuilderPort {
			public async build(_input: BuildPromptInput) {
				return {
					runway: 'runway prompt',
					hailuo: 'hailuo prompt',
					geminiVeo: 'gemini prompt',
					minimax: 'minimax prompt',
					debug: {
						storySummary: 'invalid',
						selectedConceptFamily: 'DETAIL_PROOF' as const,
						shotMappings: [],
					},
				}
			}
		}

		const router = new StubRouter()
		const useCase = new GenerateVideoUseCase(
			new InvalidPromptBuilder(),
			router,
			new StubComposer(),
			new StubRemoveBg(),
			new QualityControlService(0.5),
		)

		await expect(
			useCase.execute({
				jobId: 'job_3',
				userId: 'user_3',
				planTier: PlanTier.STARTER,
				isFirstVideo: false,
				inputImageUrl: 'https://cdn.example.com/input.png',
				stylePreset: 'TRENDY',
				productCategory: 'FASHION',
				moods: ['TRENDY'],
				keywords: ['dress'],
				copy: {
					hook: 'hook',
					description: 'desc',
					cta: 'cta',
				},
				includeWatermark: false,
			}),
		).rejects.toThrow('Prompt compilation review failed')
		expect(router.calls).toBe(0)
	})
})
